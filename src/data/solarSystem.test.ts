import { describe, expect, it } from 'vitest';
import { SOLAR_SYSTEM_OBJECTS } from './solarSystem';

describe('Solar System Explorer data', () => {
  it('contains the Sun and all eight uniquely named planets', () => {
    expect(SOLAR_SYSTEM_OBJECTS.map((object) => object.name)).toEqual([
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ]);
    expect(new Set(SOLAR_SYSTEM_OBJECTS.map((object) => object.id)).size).toBe(9);
  });
});
