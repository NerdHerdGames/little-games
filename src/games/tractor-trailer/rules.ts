export const FARM_ANIMALS = [
  { id: 'chicken', name: 'Chicken', color: 0xffe36e },
  { id: 'cow', name: 'Cow', color: 0xf4f0e8 },
  { id: 'pig', name: 'Pig', color: 0xf29ab2 },
  { id: 'sheep', name: 'Sheep', color: 0xd9e1e8 },
  { id: 'dog', name: 'Dog', color: 0xb97a45 },
  { id: 'cat', name: 'Cat', color: 0xc58a45 },
  { id: 'horse', name: 'Horse', color: 0x8b5635 },
] as const;

export type FarmAnimalId = (typeof FARM_ANIMALS)[number]['id'];

export interface TractorGameState {
  animals: readonly FarmAnimalId[];
  loaded: readonly FarmAnimalId[];
  distanceToNext: number;
  waitingForAnimal: boolean;
  complete: boolean;
}

const ENCOUNTER_DISTANCE = 260;
const BARN_DISTANCE = 360;

export const selectFarmAnimals = (random: () => number = Math.random): FarmAnimalId[] => {
  const animals = FARM_ANIMALS.map(({ id }) => id);
  for (let index = animals.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [animals[index], animals[swapIndex]] = [animals[swapIndex]!, animals[index]!];
  }
  return animals.slice(0, 3);
};

export const createTractorGame = (
  animals: readonly FarmAnimalId[] = selectFarmAnimals(),
): TractorGameState => {
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

export const driveTractor = (
  state: TractorGameState,
  distance: number,
  rightHeld: boolean,
  goHeld: boolean,
): TractorGameState => {
  if (state.waitingForAnimal || state.complete || (!rightHeld && !goHeld) || distance <= 0)
    return state;
  const distanceToNext = Math.max(0, state.distanceToNext - distance);
  const allAnimalsLoaded = state.loaded.length === state.animals.length;
  return {
    ...state,
    distanceToNext,
    waitingForAnimal: !allAnimalsLoaded && distanceToNext === 0,
    complete: allAnimalsLoaded && distanceToNext === 0,
  };
};

export const loadFarmAnimal = (state: TractorGameState, animal: FarmAnimalId): TractorGameState => {
  if (!state.waitingForAnimal || state.animals[state.loaded.length] !== animal) return state;
  const loaded = [...state.loaded, animal];
  const allAnimalsLoaded = loaded.length === state.animals.length;
  return {
    ...state,
    loaded,
    waitingForAnimal: false,
    distanceToNext: allAnimalsLoaded ? BARN_DISTANCE : ENCOUNTER_DISTANCE,
    complete: false,
  };
};
