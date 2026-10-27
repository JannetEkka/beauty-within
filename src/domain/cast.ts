// The sample women: YouCam's own API sample photos (plugins-media.makeupar.com), chosen for a range of skin tones and features.
// Until the live calls are recorded (fixtures/recorded/*.json), their readings below are placeholders
// with colours sampled from the photos, marked source: 'sample'.
import type { Portrait } from './types';

const MEDIA = 'https://plugins-media.makeupar.com/strapi/assets';

export interface CastMember {
  id: string;
  photo: string;
  /** Square face crop for Skin Analysis and Color Tones (the face must fill > 60% of the width). Fractions of the photo. */
  faceCrop: { cx: number; cy: number; size: number };
  placeholder: Portrait;
}

const p = (id: string, tone: Portrait['tone'], faceShape: Portrait['faceShape'], scores: Portrait['scores'], skinType: Portrait['skinType']): Portrait => ({
  id,
  source: 'sample',
  tone,
  faceShape,
  scores,
  skinType,
});

export const CAST: CastMember[] = [
  {
    id: 'a',
    photo: `${MEDIA}/userv2_1_03_a47a0b2043.jpg`,
    faceCrop: { cx: 0.5, cy: 0.335, size: 0.4 },
    placeholder: p('a', { skin: '#b5806b', lip: '#8a4e4c', eye: '#3a2620', eyeName: 'Brown', hair: '#2a1d18', hairName: 'Black' }, 'Oval',
      { moisture: 62, oiliness: 71, pore: 66, texture: 74, redness: 80, acne: 77, radiance: 58, dark_circle_v2: 52, age_spot: 69, wrinkle: 88, firmness: 85 },
      { whole: 'Normal', tZone: 'Combination', uZone: 'Normal' }),
  },
  {
    id: 'b',
    photo: `${MEDIA}/userv2_1_04_dde9949103.jpg`,
    faceCrop: { cx: 0.512, cy: 0.26, size: 0.34 },
    placeholder: p('b', { skin: '#98604b', lip: '#8e3f37', eye: '#2b1b16', eyeName: 'Brown', hair: '#15110f', hairName: 'Black' }, 'Oblong',
      { moisture: 55, oiliness: 74, pore: 70, texture: 68, redness: 84, acne: 79, radiance: 72, dark_circle_v2: 61, age_spot: 63, wrinkle: 90, firmness: 87 },
      { whole: 'Dry', tZone: 'Normal', uZone: 'Dry' }),
  },
  {
    id: 'c',
    photo: `${MEDIA}/hair_color_04_532c09f179.jpg`,
    faceCrop: { cx: 0.5, cy: 0.36, size: 0.45 },
    placeholder: p('c', { skin: '#8a5a4a', lip: '#7a4040', eye: '#24160f', eyeName: 'Brown', hair: '#161016', hairName: 'Black' }, 'Round',
      { moisture: 70, oiliness: 57, pore: 61, texture: 72, redness: 86, acne: 69, radiance: 81, dark_circle_v2: 66, age_spot: 59, wrinkle: 89, firmness: 88 },
      { whole: 'Combination', tZone: 'Oily', uZone: 'Normal' }),
  },
  {
    id: 'd',
    photo: `${MEDIA}/hair_color_01_45a45b4331.jpg`,
    faceCrop: { cx: 0.475, cy: 0.36, size: 0.37 },
    placeholder: p('d', { skin: '#d9bba6', lip: '#c9786e', eye: '#3b2418', eyeName: 'Brown', hair: '#221813', hairName: 'Black' }, 'Oval',
      { moisture: 66, oiliness: 63, pore: 72, texture: 76, redness: 64, acne: 80, radiance: 70, dark_circle_v2: 57, age_spot: 75, wrinkle: 91, firmness: 86 },
      { whole: 'Normal', tZone: 'Normal', uZone: 'Normal' }),
  },
  {
    id: 'e',
    photo: `${MEDIA}/hair_color_08_c003e48d17.jpg`,
    faceCrop: { cx: 0.5, cy: 0.36, size: 0.4 },
    placeholder: p('e', { skin: '#d6a88f', lip: '#b06a5e', eye: '#4a3020', eyeName: 'Brown', hair: '#653920', hairName: 'Brown' }, 'Heart',
      { moisture: 58, oiliness: 77, pore: 69, texture: 64, redness: 55, acne: 82, radiance: 66, dark_circle_v2: 70, age_spot: 61, wrinkle: 84, firmness: 83 },
      { whole: 'Dry & Redness', tZone: 'Normal', uZone: 'Dry & Redness' }),
  },
];

export const castById = new Map(CAST.map((c) => [c.id, c]));
