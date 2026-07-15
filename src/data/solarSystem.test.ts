import { describe, expect, it } from 'vitest';
import { SOLAR_SYSTEM_OBJECTS } from './solarSystem';

describe('Solar System Explorer data', () => {
  it('contains the Sun, eight planets, and five dwarf planets', () => {
    expect(SOLAR_SYSTEM_OBJECTS.map((object) => object.name)).toEqual([
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Ceres',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Pluto',
      'Haumea',
      'Makemake',
      'Eris',
    ]);
    expect(new Set(SOLAR_SYSTEM_OBJECTS.map((object) => object.id)).size).toBe(14);
  });
});
