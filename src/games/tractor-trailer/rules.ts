/**
 * Device-independent rules for Tractor Trailer Trip.
 *
 * This module contains no Phaser or browser input code, which keeps the journey
 * state predictable and easy to unit test.
 */

/** Every animal that may be selected for a journey and its fallback display color. */
export const FARM_ANIMALS = [
  { id: 'chicken', name: 'Chicken', color: 0xffe36e },
  { id: 'cow', name: 'Cow', color: 0xf4f0e8 },
  { id: 'pig', name: 'Pig', color: 0xf29ab2 },
  { id: 'sheep', name: 'Sheep', color: 0xd9e1e8 },
  { id: 'dog', name: 'Dog', color: 0xb97a45 },
  { id: 'cat', name: 'Cat', color: 0xc58a45 },
  { id: 'horse', name: 'Horse', color: 0x8b5635 },
] as const;

/** A type-safe animal identifier derived from the catalog above. */
export type FarmAnimalId = (typeof FARM_ANIMALS)[number]['id'];

/** The complete logical state required to advance one tractor journey. */
export interface TractorGameState {
  /** The three animals selected for this journey, in encounter order. */
  animals: readonly FarmAnimalId[];
  /** Animals already placed on trailers, also in encounter order. */
  loaded: readonly FarmAnimalId[];
  /** Remaining travel distance to the next animal or, finally, the barn. */
  distanceToNext: number;
  /** True while driving is paused so the current animal can be loaded. */
  waitingForAnimal: boolean;
  /** True only after all animals are loaded and the tractor reaches the barn. */
  complete: boolean;
}

// Each animal encounter uses the same short, predictable travel distance.
const ENCOUNTER_DISTANCE = 260;
// The final drive is slightly longer so reaching the barn feels distinct.
const BARN_DISTANCE = 360;

/** Shuffle the animal catalog and return three different animals. */
export const selectFarmAnimals = (random: () => number = Math.random): FarmAnimalId[] => {
  // Work on a new array so the permanent catalog is never mutated.
  const animals = FARM_ANIMALS.map(({ id }) => id);
  // Fisher-Yates produces an unbiased shuffle when Math.random is used.
  for (let index = animals.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [animals[index], animals[swapIndex]] = [animals[swapIndex]!, animals[index]!];
  }
  return animals.slice(0, 3);
};

/** Create a fresh journey, optionally with a deterministic animal list for tests. */
export const createTractorGame = (
  animals: readonly FarmAnimalId[] = selectFarmAnimals(),
): TractorGameState => {
  // A journey always needs exactly three unique stops and three unique trailers.
  if (animals.length !== 3 || new Set(animals).size !== 3)
    throw new Error('A tractor journey needs exactly three different farm animals.');
  return {
    animals: [...animals],
    loaded: [],
    distanceToNext: ENCOUNTER_DISTANCE,
    waitingForAnimal: false,
    complete: false,
  };
};

/**
 * Advance the journey while either supported drive action is held.
 * Invalid or currently blocked movement returns the same state object.
 */
export const driveTractor = (
  state: TractorGameState,
  distance: number,
  rightHeld: boolean,
  goHeld: boolean,
): TractorGameState => {
  // Driving pauses at animals, after completion, without input, or for invalid distances.
  if (state.waitingForAnimal || state.complete || (!rightHeld && !goHeld) || distance <= 0)
    return state;

  // Clamp at zero so large frame deltas cannot move beyond the destination.
  const distanceToNext = Math.max(0, state.distanceToNext - distance);
  const allAnimalsLoaded = state.loaded.length === state.animals.length;
  return {
    ...state,
    distanceToNext,
    // Before all animals are aboard, reaching zero starts a drag-and-drop stop.
    waitingForAnimal: !allAnimalsLoaded && distanceToNext === 0,
    // After all animals are aboard, reaching zero means the barn was reached.
    complete: allAnimalsLoaded && distanceToNext === 0,
  };
};

/** Place the expected animal aboard and prepare the next leg of the journey. */
export const loadFarmAnimal = (state: TractorGameState, animal: FarmAnimalId): TractorGameState => {
  // Ignore drops made at the wrong time or with a different animal than expected.
  if (!state.waitingForAnimal || state.animals[state.loaded.length] !== animal) return state;

  const loaded = [...state.loaded, animal];
  const allAnimalsLoaded = loaded.length === state.animals.length;
  return {
    ...state,
    loaded,
    waitingForAnimal: false,
    // The third animal begins the final barn leg; earlier animals begin another encounter leg.
    distanceToNext: allAnimalsLoaded ? BARN_DISTANCE : ENCOUNTER_DISTANCE,
    // Loading the final animal is not completion; the player must still reach the barn.
    complete: false,
  };
};
