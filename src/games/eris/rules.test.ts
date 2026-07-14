import { describe, expect, it } from 'vitest';
import { createErisJourney, ERIS_CHECKPOINT_IDS, reachErisCheckpoint } from './rules';

describe('Journey to Eris rules', () => {
  it('progresses through checkpoints in sequence', () => {
    const first = reachErisCheckpoint(createErisJourney(), 'one');
    expect(first.reachedNow).toBe(true);
    expect(first.state.nextIndex).toBe(1);
  });
  it('allows circling back by ignoring a checkpoint reached out of order', () => {
    const state = createErisJourney();
    const early = reachErisCheckpoint(state, 'three');
    expect(early.reachedNow).toBe(false);
    expect(early.state).toBe(state);
  });
  it('completes after all five checkpoints', () => {
    let state = createErisJourney();
    for (const id of ERIS_CHECKPOINT_IDS) state = reachErisCheckpoint(state, id).state;
    expect(state.complete).toBe(true);
    expect(state.reached).toEqual(ERIS_CHECKPOINT_IDS);
  });
});
