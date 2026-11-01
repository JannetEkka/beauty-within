// Turns the YouCam responses (Skin Analysis, Facial Color Tones Analyzer, Face Analyzer) into one Portrait.
import { CONCERNS, type FaceShape, type Portrait, type ScoredConcern, type SkinTypeLabel } from './types';

type Scan = Portrait;

const LABELS: SkinTypeLabel[] = [
  'Combination & Redness',
  'Oily & Redness',
  'Dry & Redness',
  'Combination',
  'Redness',
  'Normal',
  'Oily',
  'Dry',
];

/** Finds a skin-type label in whatever shape the engine returns it ("oily", "Dry & Redness", {type: "Oily"}...). */
export function findSkinType(v: unknown): SkinTypeLabel | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    const norm = v.replace(/_/g, ' ').replace(/\band\b/i, '&').toLowerCase();
    return LABELS.find((l) => norm.includes(l.toLowerCase()));
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['skin_type', 'type', 'label', 'result', 'value', 'name']) {
      const hit = findSkinType(o[k]);
      if (hit) return hit;
    }
  }
  return undefined;
}

const SCORED = new Set<string>(CONCERNS.filter((c) => c !== 'skin_type'));

/** Prefer raw_score: ui_score is deliberately inflated by the engine to feel encouraging. */
function scoreOf(o: Record<string, unknown>): number | undefined {
  const pick = (x: unknown) => (typeof x === 'number' && isFinite(x) ? x : undefined);
  const direct = pick(o.raw_score) ?? pick(o.ui_score);
  if (direct !== undefined) return direct;
  const whole = o.whole as Record<string, unknown> | undefined;
  return whole ? pick(whole.raw_score) ?? pick(whole.ui_score) : undefined;
}

export function parseSkinAnalysis(body: unknown): Pick<Scan, 'scores' | 'skinType'> & { maskUrl?: string } {
  const data = (body as { data?: { results?: unknown } })?.data?.results ?? (body as { results?: unknown })?.results ?? body;
  const scores: Scan['scores'] = {};
  const skinType: Scan['skinType'] = {};
  let maskUrl: string | undefined;

  const take = (type: string, o: Record<string, unknown>) => {
    const key = type.replace(/^hd_/, '').replace(/^dark_circle$/, 'dark_circle_v2');
    if (key === 'skin_type') {
      // Live replies send one entry per region: { type: 'skin_type', region: 't_zone', skin_type: 'Oily' }.
      if (typeof o.region === 'string') {
        const label = findSkinType(o.skin_type);
        if (o.region === 'whole') skinType.whole = label;
        else if (o.region === 't_zone') skinType.tZone = label;
        else if (o.region === 'u_zone') skinType.uZone = label;
        return;
      }
      skinType.whole = findSkinType(o.whole ?? o) ?? skinType.whole;
      skinType.tZone = findSkinType(o.t_zone) ?? skinType.tZone;
      skinType.uZone = findSkinType(o.u_zone) ?? skinType.uZone;
      return;
    }
    if (SCORED.has(key)) {
      const s = scoreOf(o);
      if (s !== undefined) scores[key as ScoredConcern] = Math.round(s);
    }
  };

  const d = data as Record<string, unknown>;
  if (Array.isArray(d?.output)) {
    // format: "json" -> { output: [{ type, ui_score, raw_score, mask_urls }] }
    for (const item of d.output as Record<string, unknown>[]) {
      if (typeof item.type === 'string') take(item.type, item);
      if (!maskUrl && Array.isArray(item.mask_urls) && item.type === 'all') maskUrl = String(item.mask_urls[0]);
    }
  } else if (d && typeof d === 'object') {
    // score_info.json shape -> { hd_redness: {...}, hd_pore: { whole: {...} }, ... }
    for (const [k, v] of Object.entries(d)) if (v && typeof v === 'object') take(k, v as Record<string, unknown>);
  }
  return { scores, skinType, maskUrl };
}

export function parseSkinTone(body: unknown): Scan['tone'] {
  const color = colourBlock(body);
  if (!color?.skin_color) throw new Error('Facial Color Tones result has no skin_color');
  return {
    skin: hex(color.skin_color)!,
    lip: hex(color.lip_color),
    eye: hex(color.eye_color),
    eyeName: color.eye_color_name,
    hair: hex(color.hair_color),
    hairName: color.hair_color_name,
  };
}

const hex = (v?: string) => (v ? (v.startsWith('#') ? v : `#${v}`).toLowerCase() : undefined);

function colourBlock(body: unknown): Record<string, string> | undefined {
  const b = body as { data?: { results?: { color?: Record<string, string> } }; results?: { color?: Record<string, string> } };
  return b?.data?.results?.color ?? b?.results?.color;
}

const SHAPES: FaceShape[] = ['InvTriangle', 'Triangle', 'Diamond', 'Oblong', 'Square', 'Heart', 'Round', 'Oval'];

/** Face shape from the Face Analyzer reply ("faceshape": "Oval" or { "faceshape": { "result": "Oval" } }). */
export function parseFaceShape(body: unknown): FaceShape | undefined {
  const seen = new Set<unknown>();
  const walk = (v: unknown): FaceShape | undefined => {
    if (v == null || seen.has(v)) return undefined;
    if (typeof v === 'string') {
      const norm = v.replace(/[\s_-]/g, '').toLowerCase();
      return SHAPES.find((s) => norm === s.toLowerCase() || (s === 'InvTriangle' && norm === 'invertedtriangle'));
    }
    if (typeof v !== 'object') return undefined;
    seen.add(v);
    const o = v as Record<string, unknown>;
    for (const k of Object.keys(o)) if (/face_?shape/i.test(k)) {
      const hit = walk(o[k]) ?? (typeof o[k] === 'object' ? Object.values(o[k] as object).map(walk).find(Boolean) : undefined);
      if (hit) return hit;
    }
    for (const x of Object.values(o)) {
      if (typeof x === 'object') {
        const hit = walk(x);
        if (hit) return hit;
      }
    }
    return undefined;
  };
  return walk(body);
}

export function buildPortrait(id: string, source: Portrait['source'], skin: unknown, tone: unknown, face?: unknown): Portrait {
  const { scores, skinType } = parseSkinAnalysis(skin);
  const t = parseSkinTone(tone);
  // The Face Analyzer also reads hair, lip and eye colour; use it where Color Tones left a gap.
  const f = face ? colourBlock(face) : undefined;
  if (f) {
    t.hair ??= hex(f.hair_color);
    t.hairName ??= f.hair_color_name;
    t.lip ??= hex(f.lip_color);
    t.eye ??= hex(f.eye_color);
    t.eyeName ??= f.eye_color_name;
  }
  return { id, source, scores, skinType, tone: t, faceShape: face ? parseFaceShape(face) : undefined };
}
