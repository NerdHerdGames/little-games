import { describe, expect, it } from 'vitest';
import {
  createTractorGame,
  driveTractor,
  FARM_ANIMALS,
  loadFarmAnimal,
  selectFarmAnimals,
} from './rules';

describe('tractor trailer rules', () => {
  it('selects three different animals', () => {
    const animals = selectFarmAnimals(() => 0.4);
    expect(animals).toHaveLength(3);
    expect(new Set(animals).size).toBe(3);
  });

  it('includes cat as an available farm animal', () => {
    expect(FARM_ANIMALS.map(({ id }) => id)).toContain('cat');
    expect(createTractorGame(['cat', 'dog', 'horse']).animals).toEqual(['cat', 'dog', 'horse']);
  });

  it('moves when either right or go is held', () => {
    const start = createTractorGame(['cow', 'pig', 'horse']);
    expect(driveTractor(start, 100, false, false)).toBe(start);
    expect(driveTractor(start, 100, true, false).distanceToNext).toBe(160);
    expect(driveTractor(start, 100, false, true).distanceToNext).toBe(160);
    expect(driveTractor(start, 100, true, true).distanceToNext).toBe(160);
  });

  it('stops for each animal, then requires a final drive to the barn', () => {
    let state = createTractorGame(['cow', 'pig', 'horse']);
    state = driveTractor(state, 300, true, true);
    expect(state.waitingForAnimal).toBe(true);
    expect(loadFarmAnimal(state, 'pig')).toBe(state);
    state = loadFarmAnimal(state, 'cow');
    state = loadFarmAnimal(driveTractor(state, 300, true, true), 'pig');
    state = loadFarmAnimal(driveTractor(state, 300, true, true), 'horse');
    expect(state.loaded).toEqual(['cow', 'pig', 'horse']);
    expect(state.complete).toBe(false);
    expect(state.distanceToNext).toBeGreaterThan(0);
    state = driveTractor(state, 500, true, false);
    expect(state.complete).toBe(true);
    expect(state.waitingForAnimal).toBe(false);
  });
});
