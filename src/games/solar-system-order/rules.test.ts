import { describe, expect, it } from 'vitest';
import { createSolarOrderGame, placeSolarObject, SOLAR_SYSTEM_ORDER } from './rules';

describe('solar system ordering rules', () => {
  it('includes the Sun, eight planets, and five dwarf planets', () => {
    const state = createSolarOrderGame(() => 0.5);
    expect(state.trayOrder).toHaveLength(14);
    expect(new Set(state.trayOrder).size).toBe(14);
  });
  it('places an object in its correct distance slot', () => {
    const result = placeSolarObject(
      createSolarOrderGame(() => 0),
      'ceres',
      5,
    );
    expect(result.correct).toBe(true);
    expect(result.state.placed).toContain('ceres');
  });
  it('gives a directional hint after an incorrect slot', () => {
    const state = createSolarOrderGame(() => 0);
    const result = placeSolarObject(state, 'earth', 0);
    expect(result.correct).toBe(false);
    expect(result.message).toContain('farther from the Sun');
    expect(result.state).toBe(state);
  });
  it('completes after all fourteen objects are ordered', () => {
    let state = createSolarOrderGame(() => 0);
    SOLAR_SYSTEM_ORDER.forEach((id, index) => {
      state = placeSolarObject(state, id, index).state;
    });
    expect(state.complete).toBe(true);
    expect(state.placed).toHaveLength(14);
  });
});
