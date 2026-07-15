import { describe, expect, it } from 'vitest';
import {
  addHaumeaSpin,
  createHaumeaMission,
  getHaumeaShape,
  HAUMEA_MAX_STRETCH_X,
  HAUMEA_MIN_STRETCH_Y,
} from './rules';

describe("Haumea's Speedy Spin rules", () => {
  it('starts as a circle with no spin progress', () => {
    const state = createHaumeaMission();
    expect(state).toEqual({ spin: 0, complete: false });
    expect(getHaumeaShape(state)).toEqual({ scaleX: 1, scaleY: 1 });
  });

  it('accumulates spin from repeated input', () => {
    const first = addHaumeaSpin(createHaumeaMission(), 0.2);
    const second = addHaumeaSpin(first, 0.3);
    expect(second.spin).toBeCloseTo(0.5);
    expect(second.complete).toBe(false);
  });

  it('ignores invalid or backward progress', () => {
    const state = addHaumeaSpin(createHaumeaMission(), 0.25);
    expect(addHaumeaSpin(state, -1)).toBe(state);
    expect(addHaumeaSpin(state, Number.NaN)).toBe(state);
  });

  it('stretches from a circle into Haumea oval proportions', () => {
    const shape = getHaumeaShape(addHaumeaSpin(createHaumeaMission(), 0.5));
    expect(shape.scaleX).toBeGreaterThan(1);
    expect(shape.scaleY).toBeLessThan(1);
  });

  it('clamps progress and completes at the required spin', () => {
    const state = addHaumeaSpin(createHaumeaMission(), 10);
    expect(state).toEqual({ spin: 1, complete: true });
    expect(getHaumeaShape(state)).toEqual({
      scaleX: HAUMEA_MAX_STRETCH_X,
      scaleY: HAUMEA_MIN_STRETCH_Y,
    });
  });
});
