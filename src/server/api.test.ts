import { describe, expect, it } from 'vitest';
import { layersOf } from './api';

describe('looks', () => {
  it('always layers outfit, then hairstyle, then lip tint', () => {
    expect(layersOf({ lip: 'Rose', clothes: 'o1', hairStyle: 'h1' }).map((l) => l.kind)).toEqual(['clothes', 'hairStyle', 'lip']);
    expect(layersOf({ lip: 'Pink' })).toMatchObject([{ kind: 'lip', tint: 'Pink' }]);
    expect(layersOf({})).toEqual([]);
  });
});
