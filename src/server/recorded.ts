// Sample portraits built from recorded YouCam replies, when they exist.
import { RECORDED } from '../../fixtures/recorded';
import { buildPortrait } from '../domain/scan';
import type { Portrait } from '../domain/types';

export function recordedPortrait(id: string): Portrait | undefined {
  const r = RECORDED[id];
  return r ? buildPortrait(id, 'sample', r.skin, r.tone, r.face) : undefined;
}
