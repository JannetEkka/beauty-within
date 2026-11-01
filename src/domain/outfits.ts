// Outfits from YouCam's own clothes catalogue, matched to her palette by each outfit's main colour.
// fixtures/outfits.json: women's templates only; menswear, a real fashion brand, national-team kits, costumes,
// swimwear and bottoms-only pieces are left out. "hex" is the main colour measured from each outfit's photo.
import outfitData from '../../fixtures/outfits.json';
import { deltaE } from './color';
import type { PalettePick } from './palette';

export interface Outfit {
  id: string;
  title: string;
  category: string;
  thumb: string;
  hex: string;
}

export const OUTFITS: Outfit[] = outfitData;
export const outfitById = new Map(OUTFITS.map((o) => [o.id, o]));

export interface OutfitPick {
  outfit: Outfit;
  colour: PalettePick;
  distance: number;
}

/** For each of her palette colours, the closest outfit in the catalogue (if one is close enough). */
export function pickOutfits(palette: PalettePick[], max = 4, catalog: Outfit[] = OUTFITS): OutfitPick[] {
  const used = new Set<string>();
  const picks: OutfitPick[] = [];
  for (const colour of palette) {
    const best = catalog
      .filter((o) => !used.has(o.id))
      .map((o) => ({ outfit: o, colour, distance: deltaE(o.hex, colour.hex) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (best && best.distance < 18) {
      used.add(best.outfit.id);
      picks.push(best);
    }
    if (picks.length === max) break;
  }
  return picks;
}
