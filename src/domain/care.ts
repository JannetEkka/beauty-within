// Care from within: what's already working first, then the areas to care for, from the scan and from what she tells us.
// Foods follow her diet. Amounts are the published daily amounts for adult women (19–50), not a prescription
// worked out from a photo; the only personal number is protein per kg, when she gives her weight.
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

// ---- What she tells us -------------------------------------------------------------------------

export type Diet = 'vegetarian' | 'eggetarian' | 'non-vegetarian' | 'vegan';
export type HairConcern = 'hair_fall' | 'dry_frizzy' | 'dandruff' | 'oily_scalp' | 'greying';

export interface Lifestyle {
  diet?: Diet;
  /** kg; only used for the protein amount. */
  weightKg?: number;
  activity?: 'mostly sitting' | 'some exercise' | 'very active';
  /** Glasses (about 250 ml) a day. */
  waterGlasses?: number;
  sleepHours?: number;
  sun?: 'mostly indoors' | 'some time outdoors' | 'outdoors a lot';
  hair: HairConcern[];
  /** Skin areas she wants care for, whatever the scan says. */
  skin: ScoredConcern[];
}

export const EMPTY_LIFESTYLE: Lifestyle = { hair: [], skin: [] };

export const HAIR_CONCERN_LABEL: Record<HairConcern, string> = {
  hair_fall: 'Hair fall',
  dry_frizzy: 'Dry or frizzy hair',
  dandruff: 'Dandruff',
  oily_scalp: 'Oily scalp',
  greying: 'Early greying',
};

/** Skin concerns she can pick, in her words, mapped to the scan's areas. */
export const SKIN_CONCERN_OPTIONS: { concern: ScoredConcern; label: string }[] = [
  { concern: 'moisture', label: 'Dryness' },
  { concern: 'oiliness', label: 'Oiliness' },
  { concern: 'acne', label: 'Breakouts' },
  { concern: 'age_spot', label: 'Dark spots' },
  { concern: 'radiance', label: 'Dullness' },
  { concern: 'redness', label: 'Redness or sensitivity' },
  { concern: 'dark_circle_v2', label: 'Dark circles' },
  { concern: 'pore', label: 'Visible pores' },
];

// ---- Nutrients ---------------------------------------------------------------------------------

/** Which diets a food fits: plant fits everyone; dairy not vegan; egg not vegetarian or vegan; fish and meat only non-vegetarian. */
export type FoodKind = 'plant' | 'dairy' | 'egg' | 'fish' | 'meat';
export interface Food {
  name: string;
  kind: FoodKind;
}

export interface Nutrient {
  id: string;
  name: string;
  /** Daily amount for women 19–50. */
  amount: string;
  role: string;
  foods: Food[];
  source: { label: string; url: string };
}

const ODS = (page: string, label: string) => ({ label, url: `https://ods.od.nih.gov/factsheets/${page}-HealthProfessional/` });
const f = (kind: FoodKind, ...names: string[]): Food[] => names.map((name) => ({ name, kind }));

export const NUTRIENTS: Record<string, Nutrient> = {
  water: {
    id: 'water',
    name: 'Water',
    amount: '2.7 L total water a day (about 2.2 L as drinks, the rest from food)',
    role: 'Skin draws its moisture from the body’s water.',
    foods: [...f('plant', 'water', 'coconut water', 'cucumber', 'watermelon', 'dal and soups'), ...f('dairy', 'buttermilk')],
    source: { label: 'National Academies, DRIs for Water (2004)', url: 'https://nap.nationalacademies.org/catalog/10925' },
  },
  omega3: {
    id: 'omega3',
    name: 'Omega-3 fats (ALA)',
    amount: '1.1 g a day',
    role: 'Part of the lipid barrier that holds moisture in skin and hair.',
    foods: [...f('plant', 'flaxseed (1 tbsp ≈ 2.3 g)', 'walnuts', 'chia seeds', 'mustard oil'), ...f('fish', 'mackerel or sardines')],
    source: ODS('Omega3FattyAcids', 'NIH ODS, Omega-3 Fatty Acids'),
  },
  vitE: {
    id: 'vitE',
    name: 'Vitamin E',
    amount: '15 mg a day',
    role: 'An antioxidant found in the skin’s surface oils.',
    foods: f('plant', 'almonds (28 g ≈ 7 mg)', 'sunflower seeds', 'peanuts', 'spinach'),
    source: ODS('VitaminE', 'NIH ODS, Vitamin E'),
  },
  vitC: {
    id: 'vitC',
    name: 'Vitamin C',
    amount: '75 mg a day (110 mg if you smoke)',
    role: 'Needed to make collagen; also an antioxidant in skin.',
    foods: f('plant', 'amla', 'guava (1 fruit ≈ 125 mg)', 'oranges', 'capsicum', 'tomatoes'),
    source: ODS('VitaminC', 'NIH ODS, Vitamin C'),
  },
  vitA: {
    id: 'vitA',
    name: 'Vitamin A',
    amount: '700 mcg RAE a day',
    role: 'Used in the turnover of skin cells.',
    foods: [...f('plant', 'carrots', 'sweet potato', 'pumpkin', 'papaya', 'spinach'), ...f('egg', 'eggs'), ...f('dairy', 'milk')],
    source: ODS('VitaminA', 'NIH ODS, Vitamin A'),
  },
  zinc: {
    id: 'zinc',
    name: 'Zinc',
    amount: '8 mg a day',
    role: 'Used in skin repair, hair growth and oil-gland function.',
    foods: [...f('plant', 'pumpkin seeds (28 g ≈ 2.2 mg)', 'chickpeas', 'cashews', 'oats'), ...f('dairy', 'curd'), ...f('egg', 'eggs'), ...f('meat', 'chicken')],
    source: ODS('Zinc', 'NIH ODS, Zinc'),
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    amount: '18 mg a day',
    role: 'Low iron is linked to hair shedding and can make the under-eye area look darker.',
    foods: [...f('plant', 'rajma and lentils', 'spinach', 'chana', 'with something rich in vitamin C to absorb it better'), ...f('egg', 'eggs'), ...f('meat', 'chicken or mutton liver')],
    source: ODS('Iron', 'NIH ODS, Iron'),
  },
  protein: {
    id: 'protein',
    name: 'Protein',
    amount: '0.8 g per kg of body weight a day',
    role: 'Collagen and the keratin in hair are made from it.',
    foods: [...f('plant', 'dal', 'soya chunks', 'tofu', 'peanuts'), ...f('dairy', 'paneer', 'curd'), ...f('egg', 'eggs'), ...f('fish', 'fish'), ...f('meat', 'chicken')],
    source: { label: 'National Academies, DRIs for Macronutrients (2005)', url: 'https://nap.nationalacademies.org/catalog/10490' },
  },
  vitD: {
    id: 'vitD',
    name: 'Vitamin D',
    amount: '15 mcg (600 IU) a day',
    role: 'Low vitamin D is common in India and has been linked to hair shedding.',
    foods: [...f('plant', 'sun-dried mushrooms', 'fortified foods', 'about 15 minutes of midday sun on arms'), ...f('egg', 'egg yolks'), ...f('fish', 'salmon or sardines'), ...f('dairy', 'fortified milk')],
    source: ODS('VitaminD', 'NIH ODS, Vitamin D'),
  },
  b12: {
    id: 'b12',
    name: 'Vitamin B12',
    amount: '2.4 mcg a day',
    role: 'Found almost only in animal foods, so vegetarians and vegans need a planned source. Low B12 has been linked to early greying.',
    foods: [...f('dairy', 'milk', 'curd', 'paneer'), ...f('plant', 'fortified foods (vegans: ask a doctor about a supplement)'), ...f('egg', 'eggs'), ...f('fish', 'fish'), ...f('meat', 'chicken')],
    source: ODS('VitaminB12', 'NIH ODS, Vitamin B12'),
  },
};

const ALLOWED: Record<Diet, FoodKind[]> = {
  vegan: ['plant'],
  vegetarian: ['plant', 'dairy'],
  eggetarian: ['plant', 'dairy', 'egg'],
  'non-vegetarian': ['plant', 'dairy', 'egg', 'fish', 'meat'],
};

export function foodsFor(n: Nutrient, diet: Diet | undefined): string[] {
  const ok = ALLOWED[diet ?? 'non-vegetarian'];
  return n.foods.filter((x) => ok.includes(x.kind)).map((x) => x.name);
}

/** The amount line, with her own protein figure when she gave her weight. */
export function amountFor(n: Nutrient, l: Lifestyle): string {
  if (n.id === 'protein' && l.weightKg && l.weightKg >= 30 && l.weightKg <= 200) {
    return `${n.amount}: about ${Math.round(l.weightKg * 0.8)} g for you (${l.weightKg} kg)`;
  }
  return n.amount;
}

// ---- Care areas --------------------------------------------------------------------------------

interface CareArea {
  nutrients: (keyof typeof NUTRIENTS)[];
  habits: string[];
}

const SKIN_AREAS: Record<ScoredConcern, CareArea> = {
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

const HAIR_AREAS: Record<HairConcern, CareArea> = {
  hair_fall: { nutrients: ['protein', 'iron', 'vitD', 'zinc'], habits: ['Loose hairstyles; tight ponytails pull at the root.', 'Sudden or patchy hair fall is worth a doctor’s visit: thyroid and iron are easy to test.'] },
  dry_frizzy: { nutrients: ['omega3', 'protein'], habits: ['Heat protectant before straighteners or dryers, on the lowest heat that works.', 'Oil or leave-in conditioner on the ends, not the scalp.'] },
  dandruff: { nutrients: ['zinc'], habits: ['An anti-dandruff shampoo with zinc pyrithione or ketoconazole, left on for a few minutes.', 'If it itches or spreads, see a dermatologist.'] },
  oily_scalp: { nutrients: ['zinc', 'water'], habits: ['Wash as often as your scalp needs; daily is fine.', 'Conditioner on lengths only.'] },
  greying: { nutrients: ['b12', 'iron'], habits: ['Early greying is mostly genetic, and no food reverses it. B12 and iron are worth checking with a simple blood test.'] },
};

export interface CareItem {
  key: string;
  label: string;
  /** Scan score, when the scan measured this area. */
  score?: number;
  why: 'scan' | 'you';
  nutrients: { nutrient: Nutrient; amount: string; foods: string[] }[];
  habits: string[];
}

export interface SkinStory {
  strengths: { concern: ScoredConcern; label: string; score: number }[];
  care: CareItem[];
  /** Lifestyle notes that don't belong to one area. */
  notes: string[];
}

function item(key: string, label: string, area: CareArea, why: CareItem['why'], l: Lifestyle, score?: number): CareItem {
  return {
    key,
    label,
    score,
    why,
    habits: area.habits,
    nutrients: area.nutrients.map((id) => {
      const n = NUTRIENTS[id];
      return { nutrient: n, amount: amountFor(n, l), foods: foodsFor(n, l.diet) };
    }),
  };
}

/**
 * Strengths first. Then care: what she asked about (hair, then skin), then her lowest scan areas, even when
 * they score well, since that is where care pays off most: up to three below 85, at least the lowest two.
 */
export function skinStory(p: Portrait, l: Lifestyle = EMPTY_LIFESTYLE): SkinStory {
  const entries = (Object.entries(p.scores) as [ScoredConcern, number][]).sort((a, b) => b[1] - a[1]);
  const strengths = entries
    .filter(([c]) => !l.skin.includes(c))
    .slice(0, 3)
    .map(([concern, score]) => ({ concern, label: CONCERN_LABEL[concern], score }));
  const rest = entries.filter(([c]) => !strengths.some((x) => x.concern === c)).reverse(); // lowest first
  const low = rest.filter(([, s]) => s < 85).slice(0, 3);
  const fromScan = (low.length >= 2 ? low : rest.slice(0, 2)).filter(([c]) => !l.skin.includes(c));

  const care: CareItem[] = [
    ...l.hair.map((h) => item(`hair:${h}`, HAIR_CONCERN_LABEL[h], HAIR_AREAS[h], 'you', l)),
    ...l.skin.map((c) => item(`skin:${c}`, SKIN_CONCERN_OPTIONS.find((o) => o.concern === c)?.label ?? CONCERN_LABEL[c], SKIN_AREAS[c], 'you', l, p.scores[c])),
    ...fromScan.map(([c, s]) => item(`skin:${c}`, CONCERN_LABEL[c], SKIN_AREAS[c], 'scan', l, s)),
  ];

  const notes: string[] = [];
  if (l.waterGlasses !== undefined && l.waterGlasses < 8) notes.push(`You drink about ${l.waterGlasses} glasses a day. The published amount for women is about 9 glasses (2.2 L) of drinks a day, more on hot days or when you sweat.`);
  if (l.sleepHours !== undefined && l.sleepHours < 7) notes.push(`You sleep about ${l.sleepHours} hours. Adults need 7 or more, and skin and under-eyes show it first.`);
  if (l.sun === 'outdoors a lot') notes.push('You’re outdoors a lot: sunscreen every morning, and again every two hours outside, does more for even tone than any food.');
  if (l.activity === 'very active') notes.push('You’re very active: drink more on training days, and rinse sweat off your face soon after.');
  if (l.diet === 'vegan' || l.diet === 'vegetarian') notes.push('Vegetarian and vegan diets need a planned B12 source: dairy, fortified foods, or a supplement your doctor suggests.');
  return { strengths, care, notes };
}
