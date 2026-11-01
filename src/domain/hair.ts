// Hair that frames her face, always in her own hair colour.
import type { FaceShape } from './types';

export interface HairAdvice {
  shape: FaceShape;
  line: string;
  /** Word stems matched against YouCam hairstyle template titles. */
  keywords: string[];
}

export const HAIR_BY_SHAPE: Record<FaceShape, HairAdvice> = {
  Oval: { shape: 'Oval', line: 'Balanced proportions: almost any length works, so pick by how you like to wear it.', keywords: ['long', 'wav', 'layer', 'lob', 'curl'] },
  Round: { shape: 'Round', line: 'Length past the chin and a side part draw the eye down and add shape.', keywords: ['long', 'side-part', 'layer', 'straight', 'shag'] },
  Square: { shape: 'Square', line: 'Soft waves and layers play off a strong jaw.', keywords: ['wav', 'curl', 'layer', 'shag', 'romantic'] },
  Oblong: { shape: 'Oblong', line: 'Bangs and volume at the sides balance length.', keywords: ['bang', 'fringe', 'curtain', 'bob', 'wav'] },
  Heart: { shape: 'Heart', line: 'Chin-length cuts and side bangs balance a wider forehead.', keywords: ['lob', 'bob', 'fringe', 'bang', 'flip'] },
  InvTriangle: { shape: 'InvTriangle', line: 'Fullness around the jaw, like a lob or soft curls, balances the forehead.', keywords: ['lob', 'bob', 'curl', 'wav', 'flip'] },
  Diamond: { shape: 'Diamond', line: 'Fringe and chin-length volume soften the cheekbones.', keywords: ['fringe', 'bang', 'curtain', 'bob', 'lob'] },
  Triangle: { shape: 'Triangle', line: 'Volume at the crown and temples balances the jaw.', keywords: ['layer', 'pixie', 'shag', 'updo', 'wisp'] },
};

export interface HairTemplate {
  id: string;
  title: string;
  thumb?: string;
}

/** Bold colour or shaved looks don't fit "minimal, still you", so they never get suggested. */
const NOT_SUGGESTED = /bald|buzz|crew|combover|rainbow|neon|leopard|pink|violet|lavender|purple|bow|twintail|space bun|blonde|red|copper|steel/i;

/** Up to n templates whose titles fit her face shape, best match first. */
export function pickStyles(shape: FaceShape | undefined, templates: HairTemplate[], n = 3): HairTemplate[] {
  const words = HAIR_BY_SHAPE[shape ?? 'Oval'].keywords;
  return templates
    .filter((t) => !NOT_SUGGESTED.test(t.title))
    .map((t, i) => ({ t, i, s: words.filter((w) => t.title.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.t);
}

/** Hair colour names the Color Tones and Face Analyzer return, with a typical shade for each. */
export const HAIR_SHADES = {
  Black: '#1c1714',
  'Dark brown': '#3a281f',
  Brown: '#5a3d2b',
  Auburn: '#6e3424',
  Red: '#8a3a22',
  Blonde: '#b08a5a',
  'Grey/White': '#b8b4ae',
} as const;
export type HairShade = keyof typeof HAIR_SHADES;

export function shadeFromName(name: string | undefined): HairShade | undefined {
  if (!name) return undefined;
  return (Object.keys(HAIR_SHADES) as HairShade[]).find((k) => k.toLowerCase() === name.toLowerCase());
}

/** Her portrait with the hair colour she confirmed in place of YouCam's read. */
export function withHair<P extends { tone: { hair?: string; hairName?: string } }>(p: P, shade: HairShade): P {
  return { ...p, tone: { ...p.tone, hair: HAIR_SHADES[shade], hairName: shade } };
}
