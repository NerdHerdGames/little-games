export interface TimingMatchState {
  matches: number;
  requiredMatches: number;
  phase: number;
  complete: boolean;
}

export interface TimingAttempt {
  state: TimingMatchState;
  matched: boolean;
}

export const FULL_TURN = Math.PI * 2;
export const REDUCED_MOTION_STEP = Math.PI / 12;

export const createTimingMatch = (requiredMatches: number): TimingMatchState => {
  if (!Number.isInteger(requiredMatches) || requiredMatches <= 0)
    throw new Error('Required timing matches must be a positive integer.');
  return { matches: 0, requiredMatches, phase: 0, complete: false };
};

export const angularDistance = (first: number, second: number): number => {
  const difference = Math.abs(
    ((((first - second + Math.PI) % FULL_TURN) + FULL_TURN) % FULL_TURN) - Math.PI,
  );
  return difference;
};

export const advanceTiming = (
  state: TimingMatchState,
  continuousAmount: number,
  reducedMotion: boolean,
): TimingMatchState => ({
  ...state,
  phase: (state.phase + (reducedMotion ? REDUCED_MOTION_STEP : continuousAmount)) % FULL_TURN,
});

export const attemptTimingMatch = (
  state: TimingMatchState,
  angularError: number,
  tolerance: number,
): TimingAttempt => {
  if (state.complete) return { state, matched: true };
  if (angularError > tolerance) return { state, matched: false };
  const matches = Math.min(state.requiredMatches, state.matches + 1);
  return {
    state: { ...state, matches, complete: matches === state.requiredMatches },
    matched: true,
  };
};
