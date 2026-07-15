import { describe, expect, it } from 'vitest';
import { answerFishQuestion, createFishTankState, SEA_ANIMALS } from './rules';

describe('fish tank quiz rules', () => {
  it('does not release an animal after an incorrect answer', () => {
    const state = createFishTankState();
    const result = answerFishQuestion(state, 'clownfish', 2);
    expect(result.correct).toBe(false);
    expect(result.state).toBe(state);
  });
  it('releases an animal after its correct answer', () => {
    const result = answerFishQuestion(createFishTankState(), 'pufferfish', 0);
    expect(result.correct).toBe(true);
    expect(result.state.released).toContain('pufferfish');
  });
  it('does not count the same animal twice', () => {
    const released = answerFishQuestion(createFishTankState(), 'shark', 0).state;
    expect(answerFishQuestion(released, 'shark', 0).state).toBe(released);
  });
  it('completes after all six animals are released', () => {
    let state = createFishTankState();
    for (const animal of SEA_ANIMALS)
      state = answerFishQuestion(state, animal.id, animal.correctChoice).state;
    expect(state.complete).toBe(true);
    expect(state.released).toHaveLength(6);
  });
});
