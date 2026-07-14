export const STAR_COUNT = 5;

export interface StarCollectorState {
  collected: number;
  total: number;
  complete: boolean;
}

export const createStarCollectorState = (total = STAR_COUNT): StarCollectorState => {
  if (!Number.isInteger(total) || total <= 0)
    throw new Error('Star total must be a positive integer.');
  return { collected: 0, total, complete: false };
};

export const collectStar = (state: StarCollectorState): StarCollectorState => {
  if (state.complete) return state;
  const collected = Math.min(state.collected + 1, state.total);
  return { ...state, collected, complete: collected === state.total };
};
