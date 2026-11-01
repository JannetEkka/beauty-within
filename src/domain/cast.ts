// The sample women: YouCam's own API sample photos (plugins-media.makeupar.com), chosen for a range of skin tones and features.
// Their readings are YouCam's real replies, recorded 2026-11-01 (fixtures/recorded).
import { RECORDED } from '../../fixtures/recorded';
import type { HairShade } from './hair';
import { buildPortrait } from './scan';
import type { Portrait } from './types';

const MEDIA = 'https://plugins-media.makeupar.com/strapi/assets';

export interface CastMember {
  id: string;
  photo: string;
  /** Square face crop used for the skin, colour and face-shape reads, as fractions of the photo. */
  faceCrop: { cx: number; cy: number; size: number };
  /** Hair colour as it looks in the photo. YouCam's hair read was wrong or empty on four of the five. */
  hair: HairShade;
  portrait: Portrait;
}

const member = (id: string, file: string, faceCrop: CastMember['faceCrop'], hair: HairShade): CastMember => {
  const r = RECORDED[id];
  return { id, photo: `${MEDIA}/${file}`, faceCrop, hair, portrait: buildPortrait(id, 'sample', r.skin, r.tone, r.face) };
};

export const CAST: CastMember[] = [
  member('a', 'userv2_1_03_a47a0b2043.jpg', { cx: 0.5, cy: 0.335, size: 0.4 }, 'Black'),
  member('b', 'userv2_1_04_dde9949103.jpg', { cx: 0.512, cy: 0.26, size: 0.34 }, 'Black'),
  member('c', 'hair_color_04_532c09f179.jpg', { cx: 0.5, cy: 0.36, size: 0.45 }, 'Black'),
  member('d', 'hair_color_01_45a45b4331.jpg', { cx: 0.475, cy: 0.36, size: 0.37 }, 'Black'),
  member('e', 'hair_color_08_c003e48d17.jpg', { cx: 0.5, cy: 0.36, size: 0.4 }, 'Brown'),
];

export const castById = new Map(CAST.map((c) => [c.id, c]));
