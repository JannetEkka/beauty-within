// Request bodies for the YouCam try-ons. One rule runs through all of them: her face and skin are never retouched.
import type { LipTint } from './lip';
import type { HairColourOption } from './hair';

export type Src = { fileId?: string; url?: string };
const src = (s: Src) => (s.fileId ? { src_file_id: s.fileId } : { src_file_url: s.url });

/** The makeup engine smooths skin at 50 unless told otherwise. We always set it to 0. */
export const NO_SMOOTHING = { category: 'skin_smooth', skinSmoothStrength: 0, skinSmoothColorIntensity: 0 } as const;

/** POST /s2s/v2.0/task/makeup-vto: 1 unit. A satin lip tint, nothing else. */
export function lipTintRequest(s: Src, tint: LipTint) {
  return {
    ...src(s),
    version: '1.0',
    effects: [
      NO_SMOOTHING,
      {
        category: 'lip_color',
        shape: { name: 'original' },
        style: { type: 'full' },
        palettes: [{ color: tint.hex.toUpperCase(), texture: 'satin', colorIntensity: 45 }],
      },
    ],
  };
}

/** POST /s2s/v2.0/task/hair-color: 1 unit. */
export function hairColourRequest(s: Src, c: HairColourOption) {
  return {
    ...src(s),
    pattern: { name: 'full' },
    palettes: [{ color: c.hex.toUpperCase(), color_intensity: c.intensity, shine_intensity: c.shine }],
  };
}

/** POST /s2s/v2.1/task/hair-transfer: 2 units. Keeps her own hair colour (hair_color: "src"). */
export function hairStyleRequest(s: Src, templateId: string) {
  return { ...src(s), template_id: templateId, hair_color: 'src' };
}

/** POST /s2s/v2.0/task/cloth-v4: 2 units. */
export function clothesRequest(s: Src, garment: { refUrl?: string; refFileId?: string; category: 'upper_body' | 'full_body' | 'outer' | 'auto' }) {
  return {
    ...src(s),
    ...(garment.refFileId ? { ref_file_id: garment.refFileId } : { ref_file_url: garment.refUrl }),
    garment_category: garment.category,
  };
}
