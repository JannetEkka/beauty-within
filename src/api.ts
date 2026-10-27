// Browser side of the API. The YouCam key never reaches the browser; everything goes through /api.
import type { HairTemplate } from './domain/hair';
import type { Portrait } from './domain/types';
import type { TryOn } from './server/api';

export type { TryOn };

export interface Status {
  live: boolean;
  unitsLeft?: number;
  reason?: string;
}

export interface CastEntry {
  id: string;
  photo: string;
  portrait: Portrait;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const getStatus = () => call<Status>('/status');
export const getCast = () => call<CastEntry[]>('/cast');
export const getHairTemplates = () => call<HairTemplate[]>('/hair-templates');

export function makePortrait(photo: Blob, face: Blob) {
  const form = new FormData();
  form.append('photo', photo, 'photo.jpg');
  form.append('face', face, 'face.jpg');
  return call<{ portrait: Portrait; photo: string }>('/portrait', { method: 'POST', body: form });
}

export async function tryOn(portraitId: string, t: TryOn): Promise<string> {
  const r = await call<{ image: string }>('/tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portraitId, tryOn: t }),
  });
  return r.image;
}

export interface Frame {
  /** Face centre and square size, as fractions of the photo's width and height. */
  cx: number;
  cy: number;
  size: number;
}

/** The photo for try-ons (long side ≤ 1900px) and a square face crop for the colour, skin and face-shape reads. */
export async function preparePhoto(file: File, frame: Frame): Promise<{ photo: Blob; face: Blob }> {
  const bmp = await createImageBitmap(file);
  if (Math.min(bmp.width, bmp.height) < 480) throw new Error('That photo is too small. Use one at least 480 pixels on the short side.');
  const scale = Math.min(1, 1900 / Math.max(bmp.width, bmp.height));
  const photo = await toJpeg(bmp, 0, 0, bmp.width, bmp.height, Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  const side = frame.size * Math.min(bmp.width, bmp.height);
  const x = frame.cx * bmp.width - side / 2;
  const y = frame.cy * bmp.height - side / 2;
  const out = Math.max(512, Math.min(1080, Math.round(side)));
  const face = await toJpeg(bmp, x, y, side, side, out, out);
  return { photo, face };
}

function toJpeg(src: ImageBitmap, sx: number, sy: number, sw: number, sh: number, w: number, h: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not read photo'))), 'image/jpeg', 0.92));
}
