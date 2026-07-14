export const ERIS_CHECKPOINT_IDS = ['one', 'two', 'three', 'four', 'five'] as const;
export type ErisCheckpointId = (typeof ERIS_CHECKPOINT_IDS)[number];

export interface ErisJourneyState {
  reached: readonly ErisCheckpointId[];
  nextIndex: number;
  complete: boolean;
}

export interface CheckpointResult {
  state: ErisJourneyState;
  reachedNow: boolean;
}

export const createErisJourney = (): ErisJourneyState => ({
  reached: [],
  nextIndex: 0,
  complete: false,
});

export const reachErisCheckpoint = (
  state: ErisJourneyState,
  id: ErisCheckpointId,
): CheckpointResult => {
  if (state.complete || ERIS_CHECKPOINT_IDS[state.nextIndex] !== id)
    return { state, reachedNow: false };
  const reached = [...state.reached, id];
  const nextIndex = state.nextIndex + 1;
  return {
    state: { reached, nextIndex, complete: nextIndex === ERIS_CHECKPOINT_IDS.length },
    reachedNow: true,
  };
};
