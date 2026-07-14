export const STAR_TOTAL = 5;
export interface StarCollectorState {
  collected: number;
  total: number;
  complete: boolean;
}
export const createStarCollector = (): StarCollectorState => ({
  collected: 0,
  total: STAR_TOTAL,
  complete: false,
});
export const collectStar = (state: StarCollectorState): StarCollectorState => {
  if (state.complete) return state;
  const collected = Math.min(state.total, state.collected + 1);
  return { ...state, collected, complete: collected === state.total };
};
