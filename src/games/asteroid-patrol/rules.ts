export const TOTAL_PATROL_WAVES = 5;
export const ASTEROIDS_PER_WAVE = [5, 6, 7, 8, 9] as const;
export const PATROL_UPGRADES = ['rapid-beam', 'wide-beam', 'helper-satellite'] as const;

export type PatrolUpgrade = (typeof PATROL_UPGRADES)[number];

export interface AsteroidPatrolState {
  wave: number;
  clearedInWave: number;
  awaitingUpgrade: boolean;
  complete: boolean;
  upgrades: Record<PatrolUpgrade, number>;
}

export interface AsteroidClearResult {
  state: AsteroidPatrolState;
  waveCleared: boolean;
  missionComplete: boolean;
}

export function createAsteroidPatrolState(): AsteroidPatrolState {
  return {
    wave: 1,
    clearedInWave: 0,
    awaitingUpgrade: false,
    complete: false,
    upgrades: { 'rapid-beam': 0, 'wide-beam': 0, 'helper-satellite': 0 },
  };
}

export function asteroidTargetForWave(wave: number): number {
  const target = ASTEROIDS_PER_WAVE[wave - 1];
  if (target === undefined) throw new Error(`Unknown Asteroid Patrol wave: ${wave}`);
  return target;
}

export function recordAsteroidCleared(state: AsteroidPatrolState): AsteroidClearResult {
  if (state.complete || state.awaitingUpgrade)
    return { state, waveCleared: false, missionComplete: state.complete };

  const clearedInWave = state.clearedInWave + 1;
  const waveCleared = clearedInWave >= asteroidTargetForWave(state.wave);
  const missionComplete = waveCleared && state.wave === TOTAL_PATROL_WAVES;
  const nextState: AsteroidPatrolState = {
    ...state,
    clearedInWave,
    awaitingUpgrade: waveCleared && !missionComplete,
    complete: missionComplete,
  };
  return { state: nextState, waveCleared, missionComplete };
}

export function choosePatrolUpgrade(
  state: AsteroidPatrolState,
  upgrade: PatrolUpgrade,
): AsteroidPatrolState {
  if (!state.awaitingUpgrade)
    throw new Error('An Asteroid Patrol upgrade can only be chosen between waves.');
  return {
    ...state,
    wave: state.wave + 1,
    clearedInWave: 0,
    awaitingUpgrade: false,
    upgrades: { ...state.upgrades, [upgrade]: state.upgrades[upgrade] + 1 },
  };
}
