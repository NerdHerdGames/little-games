import { describe, expect, it } from 'vitest';
import { createTractorGame, driveTractor, loadFarmAnimal, selectFarmAnimals } from './rules';

describe('tractor trailer rules', () => {
  it('selects three different animals', () => {
    const animals = selectFarmAnimals(() => 0.4);
    expect(animals).toHaveLength(3);
    expect(new Set(animals).size).toBe(3);
  });

  it('moves when either right or go is held', () => {
    const start = createTractorGame(['cow', 'pig', 'horse']);
    expect(driveTractor(start, 100, false, false)).toBe(start);
    expect(driveTractor(start, 100, true, false).distanceToNext).toBe(160);
    expect(driveTractor(start, 100, false, true).distanceToNext).toBe(160);
    expect(driveTractor(start, 100, true, true).distanceToNext).toBe(160);
  });

  it('stops for each animal and completes after all three are loaded', () => {
    let state = createTractorGame(['cow', 'pig', 'horse']);
    state = driveTractor(state, 300, true, true);
    expect(state.waitingForAnimal).toBe(true);
    expect(loadFarmAnimal(state, 'pig')).toBe(state);
    state = loadFarmAnimal(state, 'cow');
    state = loadFarmAnimal(driveTractor(state, 300, true, true), 'pig');
    state = loadFarmAnimal(driveTractor(state, 300, true, true), 'horse');
    expect(state.loaded).toEqual(['cow', 'pig', 'horse']);
    expect(state.complete).toBe(true);
  });
});
