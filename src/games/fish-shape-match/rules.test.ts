import { describe, expect, it } from 'vitest';
import { createFishShapeMatch, matchShapeFish, SHAPE_FISH } from './rules';

describe('fish shape matching rules', () => {
  it('creates one fish for each shape and color combination', () => {
    const state = createFishShapeMatch(() => 0);
    expect(state.remaining).toHaveLength(9);
    expect(new Set(state.remaining.map(({ id }) => id)).size).toBe(9);
  });
  it('does not collect a fish with the wrong shape', () => {
    const state = createFishShapeMatch(() => 0);
    const result = matchShapeFish(state, 'red-square', () => 0);
    expect(result.correct).toBe(false);
    expect(result.state).toBe(state);
    expect(result.message).toContain('circle');
  });
  it('collects any color with the requested shape', () => {
    const result = matchShapeFish(
      createFishShapeMatch(() => 0),
      'blue-circle',
      () => 0,
    );
    expect(result.correct).toBe(true);
    expect(result.state.collected).toBe(1);
    expect(result.message).toContain('blue circle');
  });
  it('completes after all nine fish are matched', () => {
    let state = createFishShapeMatch(() => 0);
    for (let index = 0; index < SHAPE_FISH.length; index += 1) {
      const fish = state.remaining.find(({ shape }) => shape === state.target);
      if (fish) state = matchShapeFish(state, fish.id, () => 0).state;
    }
    expect(state.complete).toBe(true);
    expect(state.collected).toBe(9);
  });
});
