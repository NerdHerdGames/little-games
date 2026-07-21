import { describe, expect, it } from 'vitest';
import { getTouchControlVisibility } from './TouchControlProfile';

describe('touch control visibility', () => {
  it.each([
    ['full', true, true],
    ['directions', true, false],
    ['action', false, true],
    ['none', false, false],
  ] as const)('maps %s to its visible control groups', (profile, directions, action) => {
    expect(getTouchControlVisibility(profile)).toEqual({ directions, action });
  });
});
