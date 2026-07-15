export const HAUMEA_REQUIRED_SPIN = 1;
export const HAUMEA_MAX_STRETCH_X = 1.55;
export const HAUMEA_MIN_STRETCH_Y = 0.72;

export interface HaumeaSpinState {
  spin: number;
  complete: boolean;
}

export interface HaumeaShape {
  scaleX: number;
  scaleY: number;
}

export const createHaumeaMission = (): HaumeaSpinState => ({ spin: 0, complete: false });

export const addHaumeaSpin = (state: HaumeaSpinState, amount: number): HaumeaSpinState => {
  if (!Number.isFinite(amount) || amount <= 0 || state.complete) return state;
  const spin = Math.min(HAUMEA_REQUIRED_SPIN, state.spin + amount);
  return { spin, complete: spin >= HAUMEA_REQUIRED_SPIN };
};

export const getHaumeaShape = (state: HaumeaSpinState): HaumeaShape => {
  const progress = Math.min(1, Math.max(0, state.spin / HAUMEA_REQUIRED_SPIN));
  return {
    scaleX: 1 + (HAUMEA_MAX_STRETCH_X - 1) * progress,
    scaleY: 1 - (1 - HAUMEA_MIN_STRETCH_Y) * progress,
  };
};
