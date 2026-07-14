import { describe, expect, it } from 'vitest';
import { collectStar, createStarCollectorState, STAR_COUNT } from './rules';

describe('Star Collector rules', () => {
  it('starts with five uncollected stars', () => {
    expect(createStarCollectorState()).toEqual({
      collected: 0,
      total: STAR_COUNT,
      complete: false,
    });
  });

  it('finishes exactly when the final star is collected', () => {
    let state = createStarCollectorState();
    for (let index = 0; index < STAR_COUNT - 1; index += 1) state = collectStar(state);
    expect(state.complete).toBe(false);
    state = collectStar(state);
    expect(state).toEqual({ collected: 5, total: 5, complete: true });
    expect(collectStar(state)).toBe(state);
  });

  it('rejects invalid star totals with a useful message', () => {
    expect(() => createStarCollectorState(0)).toThrow('Star total must be a positive integer.');
  });
});
