import { describe, expect, it } from 'vitest';
import { collectStar, createStarCollector, STAR_TOTAL } from './rules';

describe('Star Collector rules', () => {
  it('completes after five collected stars', () => {
    let state = createStarCollector();
    for (let index = 0; index < STAR_TOTAL; index += 1) state = collectStar(state);
    expect(state).toEqual({ collected: 5, total: 5, complete: true });
    expect(collectStar(state)).toBe(state);
  });
});
