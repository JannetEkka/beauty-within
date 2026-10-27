/** Concerns we ask YouCam Skin Analysis for (SD set, 12 concerns = 14 units). */
export const CONCERNS = [
  'moisture',
  'oiliness',
  'pore',
  'texture',
  'redness',
  'acne',
  'radiance',
  'dark_circle_v2',
  'age_spot',
  'wrinkle',
  'firmness',
  'skin_type',
] as const;
export type Concern = (typeof CONCERNS)[number];
export type ScoredConcern = Exclude<Concern, 'skin_type'>;

export type SkinTypeLabel =
  | 'Normal'
  | 'Oily'
  | 'Dry'
  | 'Combination'
  | 'Redness'
  | 'Dry & Redness'
  | 'Oily & Redness'
  | 'Combination & Redness';

export type FaceShape = 'Oval' | 'Round' | 'Square' | 'Oblong' | 'Heart' | 'InvTriangle' | 'Diamond' | 'Triangle';

/** One woman's portrait, read by YouCam: colours, face shape and skin. */
export interface Portrait {
  id: string;
  source: 'sample' | 'live';
  /** YouCam raw_score (ui_score if raw is missing), 1–100, higher is better. */
  scores: Partial<Record<ScoredConcern, number>>;
  skinType: { whole?: SkinTypeLabel; tZone?: SkinTypeLabel; uZone?: SkinTypeLabel };
  /** From the Facial Color Tones Analyzer. */
  tone: {
    skin: string;
    lip?: string;
    eye?: string;
    eyeName?: string;
    hair?: string;
    hairName?: string;
  };
  faceShape?: FaceShape;
}
