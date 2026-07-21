import { describe, expect, it } from 'vitest';
import { FACTS_BY_PLANET, PLANETS } from './planets';

describe('release planet data', () => {
  it('makes every planet available in Free Explore with facts and a replay mission', () => {
    expect(PLANETS).toHaveLength(5);
    for (const planet of PLANETS) {
      expect(planet.playable).toBe(true);
      expect(planet.missionScene).toBeTruthy();
      expect(planet.spritePath).toBe(`assets/pixel-planets/individual/${planet.id}.png`);
      expect(FACTS_BY_PLANET[planet.id]).toHaveLength(3);
    }
  });
});
