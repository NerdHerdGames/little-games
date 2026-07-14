import { describe, expect, it } from 'vitest';
import { advanceTiming, attemptTimingMatch, REDUCED_MOTION_STEP } from '../timing/rules';
import { createHaumeaMission, HAUMEA_TIMING_TOLERANCE } from './rules';

describe("Haumea's Speedy Spin rules", () => {
  it('accepts a symbol inside the timing window', () => {
    const result = attemptTimingMatch(createHaumeaMission(), 0, HAUMEA_TIMING_TOLERANCE);
    expect(result.matched).toBe(true);
    expect(result.state.matches).toBe(1);
  });

  it('forgives slightly early or late input near the tolerance edge', () => {
    expect(
      attemptTimingMatch(
        createHaumeaMission(),
        HAUMEA_TIMING_TOLERANCE * 0.98,
        HAUMEA_TIMING_TOLERANCE,
      ).matched,
    ).toBe(true);
  });

  it('does not reduce progress after an incorrect input', () => {
    const progress = attemptTimingMatch(createHaumeaMission(), 0, HAUMEA_TIMING_TOLERANCE).state;
    const miss = attemptTimingMatch(
      progress,
      HAUMEA_TIMING_TOLERANCE + 0.1,
      HAUMEA_TIMING_TOLERANCE,
    );
    expect(miss.matched).toBe(false);
    expect(miss.state).toBe(progress);
    expect(miss.state.matches).toBe(1);
  });

  it('uses fixed step-by-step advancement for reduced motion', () => {
    const advanced = advanceTiming(createHaumeaMission(), 1.7, true);
    expect(advanced.phase).toBeCloseTo(REDUCED_MOTION_STEP);
  });

  it('completes after five successful matches', () => {
    let state = createHaumeaMission();
    for (let index = 0; index < 5; index += 1)
      state = attemptTimingMatch(state, 0, HAUMEA_TIMING_TOLERANCE).state;
    expect(state.complete).toBe(true);
    expect(state.matches).toBe(5);
  });
});
