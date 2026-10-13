import { describe, expect, it } from 'vitest';
import {
  asteroidTargetForWave,
  choosePatrolUpgrade,
  createAsteroidPatrolState,
  recordAsteroidCleared,
  TOTAL_PATROL_WAVES,
} from './rules';

describe('Asteroid Patrol rules', () => {
  it('starts at the first calm wave with no upgrades', () => {
    const state = createAsteroidPatrolState();
    expect(state.wave).toBe(1);
    expect(state.clearedInWave).toBe(0);
    expect(state.complete).toBe(false);
    expect(Object.values(state.upgrades)).toEqual([0, 0, 0]);
  });

  it('counts cleared asteroids without losing progress', () => {
    const result = recordAsteroidCleared(createAsteroidPatrolState());
    expect(result.state.clearedInWave).toBe(1);
    expect(result.waveCleared).toBe(false);
  });

  it('waits for an upgrade after a non-final wave', () => {
    let state = createAsteroidPatrolState();
    for (let index = 0; index < asteroidTargetForWave(1); index += 1)
      state = recordAsteroidCleared(state).state;
    expect(state.awaitingUpgrade).toBe(true);

    state = choosePatrolUpgrade(state, 'helper-satellite');
    expect(state.wave).toBe(2);
    expect(state.clearedInWave).toBe(0);
    expect(state.upgrades['helper-satellite']).toBe(1);
  });

  it('completes after every asteroid in all five waves is cleared', () => {
    let state = createAsteroidPatrolState();
    for (let wave = 1; wave <= TOTAL_PATROL_WAVES; wave += 1) {
      for (let index = 0; index < asteroidTargetForWave(wave); index += 1)
        state = recordAsteroidCleared(state).state;
      if (wave < TOTAL_PATROL_WAVES) state = choosePatrolUpgrade(state, 'rapid-beam');
    }
    expect(state.complete).toBe(true);
    expect(state.wave).toBe(TOTAL_PATROL_WAVES);
  });

  it('rejects upgrades during active play', () => {
    expect(() => choosePatrolUpgrade(createAsteroidPatrolState(), 'wide-beam')).toThrow(
      'between waves',
    );
  });
});
