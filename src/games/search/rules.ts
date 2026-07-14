export interface SearchObjective {
  id: string;
  label: string;
}
export interface VisualSearchState {
  objectives: readonly SearchObjective[];
  objectiveIndex: number;
  activityMs: number;
  hintAfterMs: number;
  complete: boolean;
}
export interface SearchSelection {
  state: VisualSearchState;
  correct: boolean;
  completedNow: boolean;
}

export const createVisualSearch = (
  objectives: readonly SearchObjective[],
  hintAfterMs: number,
): VisualSearchState => {
  if (objectives.length === 0) throw new Error('A visual search requires at least one objective.');
  if (new Set(objectives.map((objective) => objective.id)).size !== objectives.length)
    throw new Error('Visual search objective ids must be unique.');
  if (hintAfterMs < 0) throw new Error('Visual search hint delay cannot be negative.');
  return { objectives, objectiveIndex: 0, activityMs: 0, hintAfterMs, complete: false };
};

export const advanceSearchActivity = (
  state: VisualSearchState,
  elapsedMs: number,
): VisualSearchState => ({
  ...state,
  activityMs: Math.max(0, state.activityMs + elapsedMs),
});

export const isSearchHintEligible = (state: VisualSearchState): boolean =>
  !state.complete && state.activityMs >= state.hintAfterMs;

export const selectSearchTarget = (state: VisualSearchState, targetId: string): SearchSelection => {
  if (state.complete) return { state, correct: false, completedNow: false };
  const objective = state.objectives[state.objectiveIndex];
  if (objective?.id !== targetId) return { state, correct: false, completedNow: false };
  const objectiveIndex = state.objectiveIndex + 1;
  const complete = objectiveIndex === state.objectives.length;
  return {
    state: { ...state, objectiveIndex, activityMs: 0, complete },
    correct: true,
    completedNow: complete,
  };
};

export class VisualSearchSession {
  private value: VisualSearchState;
  constructor(
    objectives: readonly SearchObjective[],
    hintAfterMs: number,
    private readonly onComplete: () => void,
  ) {
    this.value = createVisualSearch(objectives, hintAfterMs);
  }
  get state(): Readonly<VisualSearchState> {
    return this.value;
  }
  addActivity(elapsedMs: number): void {
    this.value.activityMs = Math.max(0, this.value.activityMs + elapsedMs);
  }
  select(targetId: string): SearchSelection {
    const result = selectSearchTarget(this.value, targetId);
    this.value = result.state;
    if (result.completedNow) this.onComplete();
    return result;
  }
}
