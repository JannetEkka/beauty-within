import { describe, expect, it } from 'vitest';
import { CAST } from './cast';
import { amountFor, foodsFor, NUTRIENTS, skinStory, type Lifestyle } from './care';
import { deltaE2000, hexToLab, labToHex, undertoneOf } from './color';
import hairTemplates from '../../fixtures/hair-templates.json';
import { pickStyles, withHair } from './hair';
import { OUTFITS, pickOutfits } from './outfits';
import { lipTints } from './lip';
import { paletteFor, readPalette, WARDROBE } from './palette';
import { findSkinType, parseFaceShape, parseSkinAnalysis, parseSkinTone } from './scan';
import { clothesRequest, hairStyleRequest, lipTintRequest, NO_SMOOTHING } from './tryon';

describe('colour', () => {
  it('matches the CIEDE2000 reference pairs (Sharma et al.)', () => {
    const pairs: [number[], number[], number][] = [
      [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
      [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
      [[50, 2.5, 0], [73, 25, -18], 27.1492],
      [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
      [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
    ];
    for (const [a, b, want] of pairs) {
      expect(deltaE2000({ L: a[0], a: a[1], b: a[2] }, { L: b[0], a: b[1], b: b[2] })).toBeCloseTo(want, 3);
    }
  });

  it('round-trips hex through LAB', () => {
    for (const hex of ['#b98a6a', '#eac4b4', '#744510', '#000000', '#ffffff']) expect(labToHex(hexToLab(hex))).toBe(hex);
  });

  it('reads undertone from hue', () => {
    expect(undertoneOf('#d4a6a8')).toBe('cool');
    expect(undertoneOf('#dcb491')).toBe('warm');
  });

  it('does not call skin cool just because it is deep', () => {
    // Deep skin sits redder in LAB; the depth-adjusted reading keeps these neutral.
    for (const hex of ['#98604b', '#8a5a4a', '#5c3a2e']) expect(undertoneOf(hex)).not.toBe('cool');
  });
});

describe('lip tints', () => {
  it('keep her own lip depth for every skin tone in the cast', () => {
    for (const m of CAST) {
      const lipL = hexToLab(m.portrait.tone.lip!).L;
      const tints = lipTints(m.portrait.tone.lip);
      expect(tints.map((t) => t.name)).toEqual(['Pink', 'Rose', 'Red']);
      for (const t of tints) expect(Math.abs(hexToLab(t.hex).L - lipL)).toBeLessThan(1.5);
    }
  });

  it('stays close to her natural lips (a touch, not a new colour)', () => {
    for (const m of CAST) for (const t of lipTints(m.portrait.tone.lip)) expect(deltaE2000(hexToLab(t.hex), hexToLab(m.portrait.tone.lip!))).toBeLessThan(16);
  });

  it('runs rose, pink and red in hue order', () => {
    const hue = (hex: string) => {
      const { a, b } = hexToLab(hex);
      return (Math.atan2(b, a) * 180) / Math.PI;
    };
    const [pink, rose, red] = lipTints('#a8645e');
    expect(hue(pink.hex)).toBeLessThan(hue(rose.hex));
    expect(hue(rose.hex)).toBeLessThan(hue(red.hex));
  });
});

describe('palette', () => {
  it('reads contrast from skin against hair', () => {
    expect(readPalette(withHair(CAST[3].portrait, CAST[3].hair)).contrast).toBe('high'); // fair skin, black hair
    expect(readPalette(withHair(CAST[2].portrait, CAST[2].hair)).contrast).toBe('medium');
  });

  it('gives six varied colours with a reason each, for everyone in the cast', () => {
    for (const m of CAST) {
      const picks = paletteFor(withHair(m.portrait, m.hair));
      expect(picks).toHaveLength(6);
      for (const p of picks) expect(p.why.length).toBeGreaterThan(10);
      for (let i = 0; i < picks.length; i++) for (let j = i + 1; j < picks.length; j++) expect(deltaE2000(hexToLab(picks[i].hex), hexToLab(picks[j].hex))).toBeGreaterThan(15);
    }
  });

  it('only picks from the wardrobe', () => {
    const names = new Set(WARDROBE.map((w) => w.name));
    for (const p of paletteFor(withHair(CAST[0].portrait, CAST[0].hair))) expect(names.has(p.name)).toBe(true);
  });
});

describe('skin story', () => {
  it('leads with strengths, then her lowest areas with nutrients', () => {
    for (const m of CAST) {
      const s = skinStory(m.portrait);
      expect(s.strengths).toHaveLength(3);
      expect(s.care.length).toBeGreaterThanOrEqual(2);
      const top = Math.min(...s.strengths.map((x) => x.score));
      for (const c of s.care) {
        expect(c.score).toBeLessThanOrEqual(top);
        expect(c.nutrients.length).toBeGreaterThan(0);
      }
    }
  });

  it('puts her own hair and skin concerns first, and keeps them out of strengths', () => {
    const life: Lifestyle = { hair: ['hair_fall'], skin: ['moisture'], diet: 'vegan', weightKg: 55, waterGlasses: 5, sleepHours: 6 };
    const s = skinStory(CAST[0].portrait, life);
    expect(s.care[0].key).toBe('hair:hair_fall');
    expect(s.care[1]).toMatchObject({ key: 'skin:moisture', why: 'you' });
    expect(s.strengths.map((x) => x.concern)).not.toContain('moisture');
    expect(s.care.filter((c) => c.key === 'skin:moisture')).toHaveLength(1);
    expect(s.notes.join(' ')).toMatch(/5 glasses/);
    expect(s.notes.join(' ')).toMatch(/6 hours/);
    expect(s.notes.join(' ')).toMatch(/B12/);
    const protein = s.care[0].nutrients.find((n) => n.nutrient.id === 'protein')!;
    expect(protein.amount).toMatch(/about 44 g for you \(55 kg\)/);
  });

  it('only suggests foods that fit her diet', () => {
    const protein = NUTRIENTS.protein;
    expect(foodsFor(protein, 'vegan')).toEqual(['dal', 'soya chunks', 'tofu', 'peanuts']);
    expect(foodsFor(protein, 'vegetarian')).toContain('paneer');
    expect(foodsFor(protein, 'vegetarian')).not.toContain('eggs');
    expect(foodsFor(protein, 'eggetarian')).toContain('eggs');
    expect(foodsFor(protein, 'eggetarian')).not.toContain('chicken');
    for (const n of Object.values(NUTRIENTS)) expect(foodsFor(n, 'vegan').length).toBeGreaterThan(0);
  });

  it('gives a personal protein figure only for a sensible weight', () => {
    expect(amountFor(NUTRIENTS.protein, { hair: [], skin: [], weightKg: 500 })).toBe(NUTRIENTS.protein.amount);
    expect(amountFor(NUTRIENTS.vitC, { hair: [], skin: [], weightKg: 60 })).toBe(NUTRIENTS.vitC.amount);
  });

  it('every nutrient has a daily amount, foods and a source', () => {
    for (const n of Object.values(NUTRIENTS)) {
      expect(n.amount).toMatch(/\d/);
      expect(n.foods.length).toBeGreaterThan(2);
      expect(n.source.url).toMatch(/^https:\/\//);
    }
  });
});

describe('hair', () => {
  const templates = [
    { id: '1', title: 'Long Layers' },
    { id: '2', title: 'Curtain Bangs Bob' },
    { id: '3', title: 'Buzz Cut' },
    { id: '4', title: 'Soft Waves' },
  ];
  it('picks styles that fit the face shape and skips bold looks', () => {
    expect(pickStyles('Heart', templates, 2).map((t) => t.id)).toEqual(['2', '1']);
    expect(pickStyles('Round', [...templates, { id: '5', title: 'Pixie Pink' }]).map((t) => t.id)).not.toContain('5');
  });

  it('suggests three real templates for every face shape in the cast', () => {
    for (const m of CAST) {
      const picks = pickStyles(m.portrait.faceShape, hairTemplates);
      expect(picks).toHaveLength(3);
      for (const t of picks) expect(hairTemplates.some((x) => x.id === t.id)).toBe(true);
    }
  });

});

describe('outfits', () => {
  it('finds catalogue outfits in her colours for everyone in the cast', () => {
    for (const m of CAST) {
      const picks = pickOutfits(paletteFor(withHair(m.portrait, m.hair)));
      expect(picks.length).toBeGreaterThanOrEqual(3);
      for (const p of picks) expect(p.distance).toBeLessThan(18);
      expect(new Set(picks.map((p) => p.outfit.id)).size).toBe(picks.length);
    }
  });

  it('keeps real brands, menswear and sports kits out of the catalogue', () => {
    for (const o of OUTFITS) expect(o.id).not.toMatch(/nicole_miller|masculine|sports/);
  });
});

describe('try-on requests', () => {
  it('never smooths skin in the makeup call', () => {
    const body = lipTintRequest({ fileId: 'F' }, lipTints('#a8645e')[1]);
    expect(body.effects[0]).toEqual(NO_SMOOTHING);
    expect(body.effects).toHaveLength(2);
    expect(body).toMatchObject({ src_file_id: 'F', version: '1.0' });
  });

  it('keeps her hair colour when trying a style', () => {
    expect(hairStyleRequest({ url: 'u' }, 'T1')).toEqual({ src_file_url: 'u', template_id: 'T1', hair_color: 'src' });
  });

  it('sends the garment as a reference', () => {
    expect(clothesRequest({ fileId: 'F' }, { thumb: 'g' })).toEqual({ src_file_id: 'F', ref_file_url: 'g', garment_category: 'upper_body' });
  });
});

describe('parsing YouCam responses', () => {
  it('reads format=json skin analysis, preferring raw_score', () => {
    const got = parseSkinAnalysis({ data: { results: { output: [{ type: 'oiliness', ui_score: 61, raw_score: 44.8 }, { type: 'skin_type', whole: { type: 'Combination' }, t_zone: { type: 'Oily' } }] } } });
    expect(got.scores.oiliness).toBe(45);
    expect(got.skinType).toEqual({ whole: 'Combination', tZone: 'Oily', uZone: undefined });
  });

  it('reads skin type sent as one entry per region (live format)', () => {
    const got = parseSkinAnalysis({ data: { results: { output: [
      { type: 'skin_type', region: 'whole', skin_type: 'Oily' },
      { type: 'skin_type', region: 't_zone', skin_type: 'Oily' },
      { type: 'skin_type', region: 'u_zone', skin_type: 'Normal' },
    ] } } });
    expect(got.skinType).toEqual({ whole: 'Oily', tZone: 'Oily', uZone: 'Normal' });
  });

  it('builds the recorded sample portraits', () => {
    expect(CAST.map((m) => m.portrait.faceShape)).toEqual(['Diamond', 'Triangle', 'Heart', 'Square', 'Square']);
    for (const m of CAST) {
      expect(Object.keys(m.portrait.scores)).toHaveLength(11);
      expect(m.portrait.skinType.whole).toBeDefined();
      expect(m.portrait.tone.lip).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('reads the score_info.json shape with HD keys', () => {
    const got = parseSkinAnalysis({ hd_redness: { raw_score: 72.01 }, hd_pore: { whole: { raw_score: 41.2 } }, hd_dark_circle: { raw_score: 50 } });
    expect(got.scores).toEqual({ redness: 72, pore: 41, dark_circle_v2: 50 });
  });

  it('finds skin-type labels and face shapes in loose shapes', () => {
    expect(findSkinType('oily_and_redness')).toBe('Oily & Redness');
    expect(parseFaceShape({ data: { results: { faceshape: 'Heart' } } })).toBe('Heart');
    expect(parseFaceShape({ results: { face: { faceShape: { result: 'Inverted Triangle' } } } })).toBe('InvTriangle');
    expect(parseFaceShape({ results: {} })).toBeUndefined();
  });

  it('reads tone colours and adds the # when missing', () => {
    expect(parseSkinTone({ data: { results: { color: { skin_color: 'B98A6A' } } } }).skin).toBe('#b98a6a');
  });
});
