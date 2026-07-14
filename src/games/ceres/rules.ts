export const BRIGHT_SPOT_COUNT = 3;

export interface CeresMissionState {
  collected: number;
  total: number;
  complete: boolean;
}

export const createCeresMission = (): CeresMissionState => ({
  collected: 0,
  total: BRIGHT_SPOT_COUNT,
  complete: false,
});

export const collectBrightSpot = (state: CeresMissionState): CeresMissionState => {
  if (state.complete) return state;
  const collected = Math.min(state.total, state.collected + 1);
  return { ...state, collected, complete: collected === state.total };
};
