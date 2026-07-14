import { describe, expect, it } from 'vitest';
import { applyDeadZone } from './GamepadAdapter';

describe('applyDeadZone', () => {
  it('filters stick drift at and inside the dead zone', () => {
    expect(applyDeadZone(0.25, 0.25)).toBe(0);
    expect(applyDeadZone(-0.1, 0.25)).toBe(0);
  });

  it('rescales movement outside the dead zone', () => {
    expect(applyDeadZone(0.625, 0.25)).toBeCloseTo(0.5);
    expect(applyDeadZone(-1, 0.25)).toBe(-1);
  });
});
