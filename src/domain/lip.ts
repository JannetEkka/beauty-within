// The only makeup in the app: a lip tint made from her own lip colour.
// Depth (lightness) stays where her lips are, so it is never "darker for darker skin" or "too dark for light skin".
// Only the hue moves towards rose, pink or red, with a visible lift in colour.
import { deltaE, hexToLab, labToHex } from './color';

export type TintName = 'Rose' | 'Pink' | 'Red';

export interface LipTint {
  name: TintName;
  /** What she should see: her lip depth, a touch more colour. Shown as the swatch. */
  hex: string;
  /** What we send to Makeup VTO. The engine darkens lips by about 5 L, so the input is lifted to land on `hex`. */
  renderHex: string;
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

/** Colour intensity we send to Makeup VTO; at 45 the tint was too faint to see. */
export const TINT_INTENSITY = 75;

/**
 * Lightness to add to the input so the rendered lips keep her depth. Measured on 2026-11-01 at intensity 75:
 * lips at L≈40 needed +12 (result ΔL −0.5 and −1.5); lips at L≈63 came out +3.9 lighter with +12, so lighter lips get less.
 */
export function renderLift(lipL: number): number {
  return Math.min(14, Math.max(4, 12 - 0.25 * (lipL - 41)));
}

export function lipTints(lipHex: string | undefined): LipTint[] {
  const lip = hexToLab(lipHex ?? FALLBACK_LIP);
  const chroma = Math.hypot(lip.a, lip.b);
  const L = Math.min(72, Math.max(26, lip.L));
  // Measured: +18 in gives about +11 on the lips. Lips that are already rich in colour hit the cap sooner,
  // so a deep, saturated lip gets a gentle rose touch instead of reading as red lipstick.
  const seen = Math.min(47, chroma + 11);
  const sent = Math.min(50, chroma + 18);
  return (Object.keys(HUE) as TintName[]).map((name) => {
    const h = (HUE[name] * Math.PI) / 180;
    return {
      name,
      hex: labToHex({ L, a: seen * Math.cos(h), b: seen * Math.sin(h) }),
      renderHex: labToHex({ L: L + renderLift(L), a: sent * Math.cos(h), b: sent * Math.sin(h) }),
      note: NOTE[name],
    };
  });
}

/** How far a tint sits from her natural lips. Small numbers mean "still you". */
export const tintDistance = (lipHex: string | undefined, tint: LipTint) => deltaE(lipHex ?? FALLBACK_LIP, tint.hex);
