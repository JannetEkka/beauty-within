// Skin, read kindly: what's already working first, then a few areas to care for, with food and habits.
// Nutrient amounts are the published daily amounts for adult women, not a prescription worked out from a photo.
import type { Portrait, ScoredConcern } from './types';

export const CONCERN_LABEL: Record<ScoredConcern, string> = {
  moisture: 'Hydration',
  oiliness: 'Oil balance',
  pore: 'Refined pores',
  texture: 'Smooth texture',
  redness: 'Calm skin',
  acne: 'Clear skin',
  radiance: 'Glow',
  dark_circle_v2: 'Bright under-eyes',
  age_spot: 'Even tone',
  wrinkle: 'Few fine lines',
  firmness: 'Firmness',
};

export interface Nutrient {
  id: string;
  name: string;
  /** Daily amount for women 19–50. */
  amount: string;
  role: string;
  foods: string[];
  source: { label: string; url: string };
}

const ODS = (page: string, label: string) => ({ label, url: `https://ods.od.nih.gov/factsheets/${page}-HealthProfessional/` });

export const NUTRIENTS: Record<string, Nutrient> = {
  water: {
    id: 'water',
    name: 'Water',
    amount: '2.7 L total water a day (about 2.2 L as drinks, the rest from food)',
    role: 'Skin draws its moisture from the body’s water.',
    foods: ['water', 'buttermilk', 'coconut water', 'cucumber', 'watermelon', 'dal and soups'],
    source: { label: 'National Academies, DRIs for Water (2004)', url: 'https://nap.nationalacademies.org/catalog/10925' },
  },
  omega3: {
    id: 'omega3',
    name: 'Omega-3 fats (ALA)',
    amount: '1.1 g a day',
    role: 'Part of the skin’s lipid barrier that holds moisture in.',
    foods: ['flaxseed (1 tbsp ≈ 2.3 g)', 'walnuts', 'chia seeds', 'mustard oil', 'fish such as mackerel or sardines'],
    source: ODS('Omega3FattyAcids', 'NIH ODS, Omega-3 Fatty Acids'),
  },
  vitE: {
    id: 'vitE',
    name: 'Vitamin E',
    amount: '15 mg a day',
    role: 'An antioxidant found in the skin’s surface oils.',
    foods: ['almonds (28 g ≈ 7 mg)', 'sunflower seeds', 'peanuts', 'spinach'],
    source: ODS('VitaminE', 'NIH ODS, Vitamin E'),
  },
  vitC: {
    id: 'vitC',
    name: 'Vitamin C',
    amount: '75 mg a day (110 mg if you smoke)',
    role: 'Needed to make collagen; also an antioxidant in skin.',
    foods: ['amla', 'guava (1 fruit ≈ 125 mg)', 'oranges', 'capsicum', 'tomatoes'],
    source: ODS('VitaminC', 'NIH ODS, Vitamin C'),
  },
  vitA: {
    id: 'vitA',
    name: 'Vitamin A',
    amount: '700 mcg RAE a day',
    role: 'Used in the turnover of skin cells.',
    foods: ['carrots', 'sweet potato', 'pumpkin', 'papaya', 'spinach', 'eggs'],
    source: ODS('VitaminA', 'NIH ODS, Vitamin A'),
  },
  zinc: {
    id: 'zinc',
    name: 'Zinc',
    amount: '8 mg a day',
    role: 'Used in skin repair and oil-gland function.',
    foods: ['pumpkin seeds (28 g ≈ 2.2 mg)', 'chickpeas', 'cashews', 'curd', 'eggs'],
    source: ODS('Zinc', 'NIH ODS, Zinc'),
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    amount: '18 mg a day',
    role: 'Low iron can make the under-eye area look darker and skin look paler.',
    foods: ['rajma and lentils', 'spinach', 'chana', 'eggs', 'with something rich in vitamin C to absorb it better'],
    source: ODS('Iron', 'NIH ODS, Iron'),
  },
  protein: {
    id: 'protein',
    name: 'Protein',
    amount: '0.8 g per kg of body weight a day (about 46 g for a 58 kg woman)',
    role: 'Collagen and keratin are made from it.',
    foods: ['dal', 'paneer', 'curd', 'eggs', 'soya chunks', 'chicken or fish'],
    source: { label: 'National Academies, DRIs for Macronutrients (2005)', url: 'https://nap.nationalacademies.org/catalog/10490' },
  },
};

interface CareArea {
  nutrients: (keyof typeof NUTRIENTS)[];
  habits: string[];
}

const AREAS: Record<ScoredConcern, CareArea> = {
  moisture: { nutrients: ['water', 'omega3', 'vitE'], habits: ['A plain moisturiser on damp skin, morning and night.', 'Lukewarm, not hot, water on the face.'] },
  oiliness: { nutrients: ['zinc', 'water'], habits: ['A light gel moisturiser; skipping it can make skin oilier.', 'Blotting paper instead of extra powder.'] },
  pore: { nutrients: ['vitA', 'zinc'], habits: ['Wash off sunscreen and makeup every night.'] },
  texture: { nutrients: ['vitA', 'water'], habits: ['Gentle exfoliation once a week at most.'] },
  redness: { nutrients: ['omega3'], habits: ['Fragrance-free products.', 'Lukewarm water and a soft towel, patted not rubbed.'] },
  acne: { nutrients: ['zinc', 'vitA'], habits: ['Some studies link meals lower in sugar and refined flour (whole grains, dal, vegetables) with fewer breakouts.', 'Change pillow covers often.'] },
  radiance: { nutrients: ['vitC', 'water'], habits: ['Sleep: skin looks brighter after a full night.'] },
  dark_circle_v2: { nutrients: ['iron', 'vitC'], habits: ['Seven to nine hours of sleep.', 'Sunscreen and sunglasses outdoors.'] },
  age_spot: { nutrients: ['vitC', 'vitA'], habits: ['Daily sunscreen, even indoors near windows: the best-studied habit for even tone.'] },
  wrinkle: { nutrients: ['protein', 'vitC'], habits: ['Daily sunscreen.', 'Sleep on your back if you can.'] },
  firmness: { nutrients: ['protein', 'vitC'], habits: ['Daily sunscreen.'] },
};

export interface SkinStory {
  strengths: { concern: ScoredConcern; label: string; score: number }[];
  care: { concern: ScoredConcern; label: string; score: number; nutrients: Nutrient[]; habits: string[] }[];
}

/** The three best-scoring areas, then up to three that scored lowest (below 60), never framed as flaws. */
export function skinStory(p: Portrait): SkinStory {
  const entries = (Object.entries(p.scores) as [ScoredConcern, number][]).sort((a, b) => b[1] - a[1]);
  const strengths = entries.slice(0, 3).map(([concern, score]) => ({ concern, label: CONCERN_LABEL[concern], score }));
  const care = entries
    .filter(([c, s]) => s < 60 && !strengths.some((x) => x.concern === c))
    .slice(-3)
    .reverse()
    .map(([concern, score]) => ({
      concern,
      label: CONCERN_LABEL[concern],
      score,
      nutrients: AREAS[concern].nutrients.map((n) => NUTRIENTS[n]),
      habits: AREAS[concern].habits,
    }));
  return { strengths, care };
}
