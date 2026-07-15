import { describe, expect, it } from 'vitest';
import { createPlanetFactMatch, dropPlanetForFact, PLANET_IDS } from './rules';

describe('planet fact matching rules', () => {
  it('selects a current fact from the remaining planets', () => {
    const state = createPlanetFactMatch(() => 0);
    expect(state.current?.planetId).toBe('mercury');
    expect(state.stars).toBe(0);
  });

  it('returns a hint without progress after a wrong planet', () => {
    const state = createPlanetFactMatch(() => 0);
    const result = dropPlanetForFact(state, 'venus', () => 0);
    expect(result.correct).toBe(false);
    expect(result.hint).not.toBe('');
    expect(result.state).toBe(state);
  });

  it('awards one star and removes a correctly matched planet', () => {
    const state = createPlanetFactMatch(() => 0);
    const result = dropPlanetForFact(state, 'mercury', () => 0);
    expect(result.correct).toBe(true);
    expect(result.state.stars).toBe(1);
    expect(result.state.remaining).not.toContain('mercury');
  });

  it('completes after every planet is matched', () => {
    let state = createPlanetFactMatch(() => 0);
    for (let index = 0; index < PLANET_IDS.length; index += 1) {
      const current = state.current;
      if (current) state = dropPlanetForFact(state, current.planetId, () => 0).state;
    }
    expect(state.complete).toBe(true);
    expect(state.stars).toBe(8);
  });
});
