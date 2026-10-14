import {
  createSolarOrderGame,
  placeSolarObject,
  SOLAR_SYSTEM_ORDER,
  type SolarOrderState,
} from './rules';

// The Sun is the fixed center of the puzzle, not a draggable piece.
export const PUZZLE_WORLDS = SOLAR_SYSTEM_ORDER.filter((id) => id !== 'sun');
export const DWARF_WORLDS = new Set(['ceres', 'pluto', 'haumea', 'makemake', 'eris']);

export const createSolarPuzzle = (random: () => number = Math.random): SolarOrderState =>
  placeSolarObject(createSolarOrderGame(random), 'sun', 0).state;

export const puzzleOrbit = (index: number): { radiusX: number; radiusY: number } => ({
  radiusX: 130 + index * 90,
  radiusY: 150 + index * 5,
});

export const puzzleSlot = (index: number): { x: number; y: number } => {
  const orbit = puzzleOrbit(index);
  const angle = index % 2 === 0 ? -0.55 : 0.55;
  return {
    x: 70 + orbit.radiusX * Math.cos(angle),
    y: 310 + orbit.radiusY * Math.sin(angle),
  };
};

export const findPuzzleSlot = (x: number, y: number): number => {
  let closest = -1;
  let distance = 56;
  PUZZLE_WORLDS.forEach((_id, index) => {
    const slot = puzzleSlot(index);
    const candidate = Math.hypot(x - slot.x, y - slot.y);
    if (candidate < distance) {
      closest = index;
      distance = candidate;
    }
  });
  return closest;
};
