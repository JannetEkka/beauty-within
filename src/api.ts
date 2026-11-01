// Browser side of the API. The YouCam key never reaches the browser; everything goes through /api.
import type { HairShade } from './domain/hair';
import type { Portrait } from './domain/types';
import type { Look } from './server/api';

export type { Look };

export interface Status {
  live: boolean;
  unitsLeft?: number;
  reason?: string;
}

export interface CastEntry {
  id: string;
  photo: string;
  hair: HairShade;
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

export function makePortrait(photo: Blob, face: Blob) {
  const form = new FormData();
  form.append('photo', photo, 'photo.jpg');
  form.append('face', face, 'face.jpg');
  return call<{ portrait: Portrait; photo: string }>('/portrait', { method: 'POST', body: form });
}

/** Renders the look (outfit, hairstyle, lip tint) on the portrait. Returns null when the look is empty. */
export async function buildLook(portraitId: string, look: Look): Promise<string | null> {
  const r = await call<{ image: string | null }>('/look', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portraitId, look }),
  });
  return r.image;
}

/** YouCam's JS Camera Kit: opens the camera with face alignment, lighting and size guidance, and returns the photo. */
export function openCameraKit(onPhoto: (file: File) => void, onError: (msg: string) => void) {
  const w = window as unknown as { YMK?: YMK };
  const start = () => {
    try {
      w.YMK!.init({ faceDetectionMode: 'makeup', imageFormat: 'base64', language: 'enu' });
      w.YMK!.openCameraKit();
    } catch (e) {
      onError(`Camera could not start: ${(e as Error).message}`);
    }
  };
  cameraHandler = async (result) => {
    const item = result?.images?.[0]?.image;
    if (!item) return;
    const blob = typeof item === 'string' ? await (await fetch(item.startsWith('data:') ? item : `data:image/jpeg;base64,${item}`)).blob() : item;
    w.YMK?.close?.();
    onPhoto(new File([blob], 'camera.jpg', { type: blob.type || 'image/jpeg' }));
  };
  if (!cameraErrorHooked) {
    cameraErrorHooked = true;
    // The kit rejects with "error.no.camera" when there's no camera or permission was refused.
    window.addEventListener('unhandledrejection', (e) => {
      if (/camera/i.test(String(e.reason))) onError('No camera found, or camera access was blocked. Upload a photo instead.');
    });
  }
  if (w.YMK) return start();
  // The kit's YMKAsyncInit hook doesn't fire when the script is added late, so start from the script's load event.
  const tag = document.createElement('script');
  tag.src = 'https://plugins-media.makeupar.com/v2.5-camera-kit/sdk.js';
  tag.onload = () => {
    if (!w.YMK) return onError('The YouCam Camera Kit could not start. Upload a photo instead.');
    w.YMK.addEventListener('faceDetectionCaptured', (r: CameraResult) => cameraHandler?.(r));
    start();
  };
  tag.onerror = () => onError('The YouCam Camera Kit could not load. Upload a photo instead.');
  document.body.appendChild(tag);
}

type CameraResult = { images?: { image: string | Blob }[] };
let cameraHandler: ((r: CameraResult) => void) | undefined;
let cameraErrorHooked = false;
interface YMK {
  init(o: Record<string, unknown>): void;
  openCameraKit(): void;
  close?(): void;
  addEventListener(name: string, cb: (r: CameraResult) => void): void;
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
