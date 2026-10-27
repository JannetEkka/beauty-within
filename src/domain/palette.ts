// Clothing colours chosen from her own colouring: undertone, the contrast between her skin and hair,
// and echoes of her eye and lip colour. Nothing about her is adjusted to fit the clothes.
import { deltaE, hexToLab, hueAngle, undertoneOf, type Undertone } from './color';
import type { Portrait } from './types';

export interface WardrobeColour {
  name: string;
  hex: string;
}

export const WARDROBE: WardrobeColour[] = [
  { name: 'Ivory', hex: '#f4eee1' },
  { name: 'Soft white', hex: '#fafaf7' },
  { name: 'Oatmeal', hex: '#d8c8b0' },
  { name: 'Camel', hex: '#b88a5a' },
  { name: 'Chocolate', hex: '#5a3a2a' },
  { name: 'Charcoal', hex: '#3a3a3c' },
  { name: 'Navy', hex: '#1f2a44' },
  { name: 'Ink', hex: '#14161c' },
  { name: 'Emerald', hex: '#1e6b52' },
  { name: 'Sage', hex: '#9caf88' },
  { name: 'Olive', hex: '#6b6b3a' },
  { name: 'Teal', hex: '#1f6f78' },
  { name: 'Cobalt', hex: '#2e4fa3' },
  { name: 'Plum', hex: '#5e2a4e' },
  { name: 'Berry', hex: '#8e2b53' },
  { name: 'Rust', hex: '#a4462a' },
  { name: 'Terracotta', hex: '#c46a4a' },
  { name: 'Mustard', hex: '#c9a033' },
  { name: 'Blush', hex: '#e8b7b0' },
  { name: 'Lavender', hex: '#b9a9d6' },
  { name: 'Coral', hex: '#e8735c' },
  { name: 'Burgundy', hex: '#6e1f2e' },
];

export type Contrast = 'soft' | 'medium' | 'high';

export interface PaletteRead {
  undertone: Undertone;
  contrast: Contrast;
  /** Lightness gap between skin and hair, in LAB L. */
  contrastL: number;
}

export interface PalettePick extends WardrobeColour {
  why: string;
  score: number;
}

export function readPalette(p: Portrait): PaletteRead {
  const skin = hexToLab(p.tone.skin);
  const hair = p.tone.hair ? hexToLab(p.tone.hair) : { ...skin, L: skin.L - 35 };
  const contrastL = Math.abs(skin.L - hair.L);
  return {
    undertone: undertoneOf(p.tone.skin),
    contrast: contrastL > 45 ? 'high' : contrastL > 25 ? 'medium' : 'soft',
    contrastL,
  };
}

const chroma = (hex: string) => {
  const { a, b } = hexToLab(hex);
  return Math.hypot(a, b);
};

/** Warm hues run red-orange to yellow-green; cool hues run green-blue through violet to pink. */
function warmth(hex: string): 'warm' | 'cool' | 'neutral' {
  if (chroma(hex) < 12) return 'neutral';
  const h = hueAngle(hex);
  return h >= 30 && h <= 110 ? 'warm' : 'cool';
}

export function paletteFor(p: Portrait, count = 6): PalettePick[] {
  const read = readPalette(p);
  const skinL = hexToLab(p.tone.skin).L;
  const scored = WARDROBE.map((c) => {
    const reasons: string[] = [];
    let score = 0;
    // Contrast: clothes that sit about as far from her skin as her hair does look like they belong to her.
    const gap = Math.abs(hexToLab(c.hex).L - skinL);
    score -= Math.abs(gap - read.contrastL) / 8;
    if (Math.abs(gap - read.contrastL) < 12) reasons.push(`matches the ${read.contrast} contrast between your skin and hair`);
    // Undertone.
    const w = warmth(c.hex);
    if (w === 'neutral') score += 1;
    else if (read.undertone === 'neutral') score += 1.5;
    else if (w === read.undertone) {
      score += 3;
      reasons.push(`a ${w} colour, like your ${read.undertone} undertone`);
    } else score -= 1.5;
    // Echoes of her own colours.
    if (p.tone.eye && deltaE(c.hex, p.tone.eye) < 22) {
      score += 3;
      reasons.push('picks up the colour of your eyes');
    }
    if (p.tone.lip && deltaE(c.hex, p.tone.lip) < 18) {
      score += 2;
      reasons.push('close to your natural lip colour');
    }
    const why = reasons.length ? reasons.join('; ') : 'an easy neutral with your colouring';
    return { ...c, why: why[0].toUpperCase() + why.slice(1) + '.', score };
  }).sort((a, b) => b.score - a.score);

  // Keep the picks varied: no two near-identical colours.
  const picks: PalettePick[] = [];
  for (const c of scored) {
    if (picks.every((x) => deltaE(x.hex, c.hex) > 15)) picks.push(c);
    if (picks.length === count) break;
  }
  return picks;
}
