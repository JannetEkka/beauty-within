// Hair that frames her face, in her own hair colour first. Colour changes stay subtle: shine, or a soft glaze.
import { hexToLab, labToHex } from './color';
import type { FaceShape } from './types';

export interface HairAdvice {
  shape: FaceShape;
  line: string;
  /** Words matched against YouCam hairstyle template titles. */
  keywords: string[];
}

export const HAIR_BY_SHAPE: Record<FaceShape, HairAdvice> = {
  Oval: { shape: 'Oval', line: 'Balanced proportions: almost any length works, so pick by how you like to wear it.', keywords: ['layer', 'long', 'bob', 'wave', 'straight'] },
  Round: { shape: 'Round', line: 'Length past the chin and a side part draw the eye down and add shape.', keywords: ['long', 'layer', 'side', 'straight'] },
  Square: { shape: 'Square', line: 'Soft waves and side-swept layers play off a strong jaw.', keywords: ['wave', 'curl', 'side', 'layer'] },
  Oblong: { shape: 'Oblong', line: 'Bangs and volume at the sides balance length.', keywords: ['bang', 'fringe', 'wave', 'bob', 'curl'] },
  Heart: { shape: 'Heart', line: 'Chin-length cuts and side bangs balance a wider forehead.', keywords: ['bob', 'bang', 'fringe', 'lob', 'side'] },
  InvTriangle: { shape: 'InvTriangle', line: 'Fullness around the jaw, like a lob or soft curls, balances the forehead.', keywords: ['lob', 'bob', 'curl', 'wave'] },
  Diamond: { shape: 'Diamond', line: 'Side-swept fringe and chin-length volume soften the cheekbones.', keywords: ['fringe', 'bang', 'bob', 'side'] },
  Triangle: { shape: 'Triangle', line: 'Volume at the crown and temples balances the jaw.', keywords: ['volume', 'layer', 'pixie', 'short', 'wave'] },
};

export interface HairTemplate {
  id: string;
  title: string;
  thumb?: string;
  category?: string;
}

/** Up to n templates whose titles fit her face shape; falls back to the first templates if nothing matches. */
export function pickStyles(shape: FaceShape | undefined, templates: HairTemplate[], n = 3): HairTemplate[] {
  const words = HAIR_BY_SHAPE[shape ?? 'Oval'].keywords;
  const scored = templates
    .filter((t) => !/men|male|beard|buzz/i.test(`${t.title} ${t.category ?? ''}`) || /women|female/i.test(`${t.title} ${t.category ?? ''}`))
    .map((t) => ({ t, s: words.filter((w) => t.title.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, n).map((x) => x.t);
}

export interface HairColourOption {
  name: string;
  hex: string;
  intensity: number;
  shine: number;
  note: string;
}

/** Her own colour with shine, and a soft glaze one small step warmer. No bleach-level changes. */
export function hairColours(hairHex: string | undefined): HairColourOption[] {
  const base = hairHex ?? '#2a1d18';
  const lab = hexToLab(base);
  const glaze = labToHex({ L: Math.min(lab.L + 4, 60), a: lab.a + 4, b: lab.b + 6 });
  return [
    { name: 'Your colour, with shine', hex: base, intensity: 20, shine: 70, note: 'Nothing changes but the gloss.' },
    { name: 'Soft warm glaze', hex: glaze, intensity: 35, shine: 55, note: 'A gentle warmth over your natural colour.' },
  ];
}
