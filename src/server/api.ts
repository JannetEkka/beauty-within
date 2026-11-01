// The app's API, independent of the host. Cloudflare Pages Functions call handle().
// Every YouCam result is cached by content hash, and live calls stop while the account is below UNIT_FLOOR.
import { castById } from '../domain/cast';
import { outfitById } from '../domain/outfits';
import hairTemplates from '../../fixtures/hair-templates.json';
import { lipTints, type TintName } from '../domain/lip';
import { buildPortrait } from '../domain/scan';
import { clothesRequest, hairStyleRequest, lipTintRequest, type Src } from '../domain/tryon';
import { CONCERNS, type Portrait } from '../domain/types';
import { resultImageUrl, YouCam, YouCamError, type TaskKind } from './youcam';

export interface Store {
  get(key: string, type: 'json'): Promise<unknown>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  put(key: string, value: string | ArrayBuffer, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  YOUCAM_HACK_API_KEY?: string;
  YOUCAM_API_BASE?: string;
  /** Live calls stop when the account has fewer units than this. */
  UNIT_FLOOR?: string;
  /** Live portraits per visitor per day. */
  LIVE_SCANS_PER_DAY?: string;
  CACHE: Store;
}

// Global console accounts (yce.perfectcorp.com); India-region accounts set YOUCAM_API_BASE to https://yce-api-01.makeupar.com.
const DEFAULT_BASE = 'https://yce-api-01.perfectcorp.com';
const DAY = 86_400;
const LIVE_TTL = 2 * DAY; // visitors' photos and results are dropped after two days
const PORTRAIT_COST = 14 + 20 + 10; // skin analysis + colour tones + face shape

/**
 * A look is up to three layers on one photo, always applied in this order so each result feeds the next:
 * the outfit, then the hairstyle, then the lip tint (makeup last, on the final face).
 * Hair colour is left out on purpose: YouCam's hair-colour call brightened the whole photo, face included.
 */
export interface Look {
  clothes?: string;
  hairStyle?: string;
  lip?: TintName;
}

type Layer = { kind: 'clothes'; outfitId: string } | { kind: 'hairStyle'; templateId: string } | { kind: 'lip'; tint: TintName; render: number };

/** Bumped when the lip render changes, so cached looks with the old tint aren't served. 3: visible, depth-calibrated, capped for rich lips (11-02). */
const LIP_RENDER = 3;

const LAYER_TASK: Record<Layer['kind'], { task: TaskKind; units: number }> = {
  clothes: { task: 'cloth-v4', units: 2 },
  hairStyle: { task: 'hair-transfer', units: 2 },
  lip: { task: 'makeup-vto', units: 1 },
};

const HAIR_TEMPLATE_IDS = new Set(hairTemplates.map((t) => t.id));

export function layersOf(look: Look): Layer[] {
  const out: Layer[] = [];
  if (look.clothes) out.push({ kind: 'clothes', outfitId: look.clothes });
  if (look.hairStyle) out.push({ kind: 'hairStyle', templateId: look.hairStyle });
  if (look.lip) out.push({ kind: 'lip', tint: look.lip, render: LIP_RENDER });
  return out;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function sha256(data: ArrayBuffer | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function client(env: Env) {
  if (!env.YOUCAM_HACK_API_KEY) return undefined;
  return new YouCam({ apiKey: env.YOUCAM_HACK_API_KEY, baseUrl: env.YOUCAM_API_BASE || DEFAULT_BASE });
}

async function gate(env: Env, yc: YouCam, cost: number): Promise<string | undefined> {
  const floor = Number(env.UNIT_FLOOR ?? 150);
  const left = await yc.unitsLeft();
  if (left - cost < floor) return `The demo's free API units are being saved (${Math.floor(left)} left). The sample portraits still work.`;
  return undefined;
}

async function underDailyLimit(env: Env, who: string): Promise<boolean> {
  const key = `rate:${new Date().toISOString().slice(0, 10)}:${await sha256(who)}`;
  const n = Number((await env.CACHE.get(key, 'json')) ?? 0);
  if (n >= Number(env.LIVE_SCANS_PER_DAY ?? 3)) return false;
  await env.CACHE.put(key, JSON.stringify(n + 1), { expirationTtl: DAY });
  return true;
}

async function ledger(env: Env, entry: Record<string, unknown>) {
  const key = `ledger:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
  await env.CACHE.put(key, JSON.stringify({ ...entry, at: Date.now() }), { expirationTtl: 90 * DAY });
}

interface StoredPortrait {
  portrait: Portrait;
  photoKey: string;
}

export async function handle(req: Request, env: Env): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/^\/api/, '');
  try {
    if (req.method === 'GET' && path === '/status') {
      const yc = client(env);
      if (!yc) return json({ live: false, reason: 'This deployment has no API key yet, so only the sample portraits work.' });
      const left = await yc.unitsLeft().catch(() => undefined);
      return json({ live: left !== undefined && left > Number(env.UNIT_FLOOR ?? 150) + PORTRAIT_COST, unitsLeft: left !== undefined ? Math.floor(left) : undefined });
    }
    if (req.method === 'GET' && path === '/cast') {
      return json([...castById.values()].map((c) => ({ id: c.id, photo: c.photo, hair: c.hair, portrait: c.portrait })));
    }
    if (req.method === 'POST' && path === '/portrait') return await portrait(req, env);
    if (req.method === 'POST' && path === '/look') return await look(req, env);

    const img = /^\/img\/([a-z0-9_-]+)$/i.exec(path);
    if (req.method === 'GET' && img) {
      const bytes = await env.CACHE.get(`img:${img[1]}`, 'arrayBuffer');
      if (!bytes) return json({ error: 'not found' }, 404);
      return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' } });
    }
    return json({ error: 'not found' }, 404);
  } catch (e) {
    const status = e instanceof YouCamError ? (e.status >= 400 && e.status < 600 ? e.status : 502) : 500;
    return json({ error: e instanceof Error ? e.message : 'unexpected error', code: e instanceof YouCamError ? e.code : undefined }, status);
  }
}

async function portrait(req: Request, env: Env): Promise<Response> {
  const yc = client(env);
  if (!yc) return json({ error: 'Your own portrait needs the API key on this deployment. Try a sample portrait.' }, 503);
  const form = await req.formData();
  const photo = form.get('photo') as unknown as File | string | null;
  const face = form.get('face') as unknown as File | string | null;
  if (!photo || typeof photo === 'string' || !face || typeof face === 'string') return json({ error: 'photo and face crop are both needed' }, 400);
  const photoBytes = await photo.arrayBuffer();
  const faceBytes = await face.arrayBuffer();
  if (photoBytes.byteLength > 8e6 || faceBytes.byteLength > 8e6) return json({ error: 'photo too large' }, 413);

  const id = await sha256(photoBytes);
  const cached = (await env.CACHE.get(`portrait:${id}`, 'json')) as StoredPortrait | null;
  if (cached) return json({ portrait: cached.portrait, photo: `/api/img/${cached.photoKey}`, cached: true });

  const why = await gate(env, yc, PORTRAIT_COST);
  if (why) return json({ error: why }, 429);
  if (!(await underDailyLimit(env, req.headers.get('CF-Connecting-IP') ?? 'local')))
    return json({ error: 'That’s today’s limit of live portraits for this device. The sample portraits still work.' }, 429);

  const faceId = await yc.upload(faceBytes, 'image/jpeg', 'face.jpg');
  const [skin, tone, shape] = await Promise.all([
    yc.run('skin-analysis', { src_file_id: faceId, dst_actions: [...CONCERNS], format: 'json' }),
    yc.run('skin-tone-analysis', { src_file_id: faceId, face_angle_strictness_level: 'medium' }),
    yc.run('face-attr-analysis', { src_file_id: faceId, features: ['faceShape', 'hairColor', 'lipColor', 'eyeColor'], face_angle_strictness_level: 'medium' }),
  ]);
  const p = buildPortrait(id, 'live', skin, tone, shape);
  const photoKey = `photo-${id}`;
  await env.CACHE.put(`img:${photoKey}`, photoBytes, { expirationTtl: LIVE_TTL });
  const stored: StoredPortrait = { portrait: p, photoKey };
  await env.CACHE.put(`portrait:${id}`, JSON.stringify(stored), { expirationTtl: LIVE_TTL });
  await ledger(env, { kind: 'portrait', units: PORTRAIT_COST, id });
  return json({ portrait: p, photo: `/api/img/${photoKey}` });
}

function bodyFor(t: Layer, s: Src, p: Portrait) {
  switch (t.kind) {
    case 'lip': {
      const tint = lipTints(p.tone.lip).find((x) => x.name === t.tint);
      if (!tint) throw new YouCamError('unknown tint', 400);
      return lipTintRequest(s, tint);
    }
    case 'hairStyle':
      if (!HAIR_TEMPLATE_IDS.has(t.templateId)) throw new YouCamError('unknown hairstyle', 400);
      return hairStyleRequest(s, t.templateId);
    case 'clothes': {
      const outfit = outfitById.get(t.outfitId);
      if (!outfit) throw new YouCamError('unknown outfit', 400);
      return clothesRequest(s, outfit);
    }
  }
}

/** Builds a look layer by layer. Every prefix of layers is cached, so changing one layer re-runs only from there. */
async function look(req: Request, env: Env): Promise<Response> {
  const { portraitId, look: wanted } = (await req.json()) as { portraitId?: string; look?: Look };
  if (!portraitId || !wanted) return json({ error: 'portraitId and look required' }, 400);

  const cast = castById.get(portraitId);
  const stored = cast ? undefined : ((await env.CACHE.get(`portrait:${portraitId}`, 'json')) as StoredPortrait | null);
  if (!cast && !stored) return json({ error: 'This portrait has expired. Start again.' }, 404);
  const p = cast ? cast.portrait : stored!.portrait;

  const layers = layersOf(wanted);
  if (!layers.length) return json({ image: null, layers: [] });
  const tmp = { url: '' } as Src;
  for (const l of layers) bodyFor(l, tmp, p); // validates every layer before any unit is spent

  const keys: string[] = [];
  for (let i = 1; i <= layers.length; i++) keys.push(`look-${await sha256(`${portraitId}|${JSON.stringify(layers.slice(0, i))}`)}`);

  // Longest prefix already rendered.
  let done = 0;
  let prev: ArrayBuffer | null = null;
  for (let i = layers.length; i >= 1; i--) {
    const hit = await env.CACHE.get(`img:${keys[i - 1]}`, 'arrayBuffer');
    if (hit) {
      done = i;
      prev = hit;
      break;
    }
  }
  if (done === layers.length) return json({ image: `/api/img/${keys[done - 1]}`, cached: true });

  const yc = client(env);
  if (!yc) return json({ error: 'Try-ons need the API key on this deployment.' }, 503);
  const cost = layers.slice(done).reduce((n, l) => n + LAYER_TASK[l.kind].units, 0);
  const why = await gate(env, yc, cost);
  if (why) return json({ error: why }, 429);

  for (let i = done; i < layers.length; i++) {
    const layer = layers[i];
    let s: Src;
    if (prev) s = { fileId: await yc.upload(prev, 'image/jpeg', 'look.jpg') };
    else if (cast) s = { url: cast.photo }; // sample portraits use YouCam's own hosted photo
    else {
      const bytes = await env.CACHE.get(`img:${stored!.photoKey}`, 'arrayBuffer');
      if (!bytes) return json({ error: 'This portrait has expired. Start again.' }, 404);
      s = { fileId: await yc.upload(bytes, 'image/jpeg') };
    }
    const { task, units } = LAYER_TASK[layer.kind];
    const result = await yc.run(task, bodyFor(layer, s, p), { timeoutMs: 90_000 });
    const out = resultImageUrl(result);
    if (!out) return json({ error: 'The try-on came back without an image.' }, 502);
    const img = await fetch(out);
    if (!img.ok) return json({ error: 'Could not fetch the try-on image.' }, 502);
    prev = await img.arrayBuffer();
    await env.CACHE.put(`img:${keys[i]}`, prev, cast ? undefined : { expirationTtl: LIVE_TTL });
    await ledger(env, { kind: layer.kind, units, portrait: portraitId });
  }
  return json({ image: `/api/img/${keys[layers.length - 1]}` });
}
