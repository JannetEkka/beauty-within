// The only makeup in the app: a lip tint made from her own lip colour.
// Depth (lightness) stays exactly where her lips are, so it is never "darker for darker skin" or "too dark for light skin".
// Only the hue moves a little towards rose, pink or red, with a small lift in colour.
import { deltaE, hexToLab, labToHex } from './color';

export type TintName = 'Rose' | 'Pink' | 'Red';

export interface LipTint {
  name: TintName;
  hex: string;
  note: string;
}

/** LAB hue angles: pink sits near 5°, rose near 20°, a soft brick-red near 35°. */
const HUE: Record<TintName, number> = { Pink: 5, Rose: 20, Red: 35 };
const NOTE: Record<TintName, string> = {
  Rose: 'Your own lip colour with a touch of rose.',
  Pink: 'Your own lip colour with a touch of pink.',
  Red: 'Your own lip colour with a touch of red.',
};

/** Average natural lip colour, used only when the scan couldn't read the lips. */
const FALLBACK_LIP = '#a8645e';

export function lipTints(lipHex: string | undefined): LipTint[] {
  const lip = hexToLab(lipHex ?? FALLBACK_LIP);
  const chroma = Math.hypot(lip.a, lip.b);
  // A touch, not a statement: at most 8 more chroma than her lips, within a natural band.
  const c = Math.min(42, Math.max(20, chroma + 8));
  const L = Math.min(72, Math.max(26, lip.L));
  return (Object.keys(HUE) as TintName[]).map((name) => {
    const h = (HUE[name] * Math.PI) / 180;
    return { name, hex: labToHex({ L, a: c * Math.cos(h), b: c * Math.sin(h) }), note: NOTE[name] };
  });
}

/** How far a tint sits from her natural lips. Small numbers mean "still you". */
export const tintDistance = (lipHex: string | undefined, tint: LipTint) => deltaE(lipHex ?? FALLBACK_LIP, tint.hex);
