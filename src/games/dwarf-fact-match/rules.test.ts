import { describe, expect, it } from 'vitest';
import { createDwarfFactMatch, dropDwarfForFact, DWARF_IDS } from './rules';

describe('dwarf planet fact matching rules', () => {
  it('starts with a fact for one of five worlds', () => {
    const state = createDwarfFactMatch(() => 0);
    expect(state.current?.dwarfId).toBe('ceres');
    expect(state.remaining).toHaveLength(5);
  });
  it('gives a hint without losing progress after a wrong drop', () => {
    const state = createDwarfFactMatch(() => 0);
    const result = dropDwarfForFact(state, 'pluto', () => 0);
    expect(result.correct).toBe(false);
    expect(result.hint).not.toBe('');
    expect(result.state).toBe(state);
  });
  it('awards a star after a correct drop', () => {
    const result = dropDwarfForFact(
      createDwarfFactMatch(() => 0),
      'ceres',
      () => 0,
    );
    expect(result.correct).toBe(true);
    expect(result.state.stars).toBe(1);
  });
  it('completes after all five dwarf planets', () => {
    let state = createDwarfFactMatch(() => 0);
    for (let index = 0; index < DWARF_IDS.length; index += 1) {
      const current = state.current;
      if (current) state = dropDwarfForFact(state, current.dwarfId, () => 0).state;
    }
    expect(state.complete).toBe(true);
    expect(state.stars).toBe(5);
  });
});
