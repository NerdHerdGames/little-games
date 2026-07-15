export const SOLAR_SYSTEM_ORDER = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'mars',
  'ceres',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'haumea',
  'makemake',
  'eris',
] as const;

export type SolarOrderId = (typeof SOLAR_SYSTEM_ORDER)[number];

export const SOLAR_ORDER_NAMES: Readonly<Record<SolarOrderId, string>> = {
  sun: 'Sun',
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  mars: 'Mars',
  ceres: 'Ceres',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  haumea: 'Haumea',
  makemake: 'Makemake',
  eris: 'Eris',
};

export interface SolarOrderState {
  trayOrder: readonly SolarOrderId[];
  placed: readonly SolarOrderId[];
  complete: boolean;
}

export interface SolarOrderPlacementResult {
  correct: boolean;
  message: string;
  state: SolarOrderState;
}

const shuffle = (random: () => number): SolarOrderId[] => {
  const items = [...SOLAR_SYSTEM_ORDER];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(Math.max(0, random()) * (index + 1)));
    const item = items[index];
    const swap = items[swapIndex];
    if (item && swap) [items[index], items[swapIndex]] = [swap, item];
  }
  return items;
};

export const createSolarOrderGame = (random: () => number = Math.random): SolarOrderState => ({
  trayOrder: shuffle(random),
  placed: [],
  complete: false,
});

export const placeSolarObject = (
  state: SolarOrderState,
  objectId: SolarOrderId,
  slotIndex: number,
): SolarOrderPlacementResult => {
  if (state.complete || state.placed.includes(objectId))
    return { correct: false, message: 'That object is already on the board.', state };
  if (slotIndex < 0 || slotIndex >= SOLAR_SYSTEM_ORDER.length)
    return { correct: false, message: 'Place it inside a numbered slot.', state };

  const correctIndex = SOLAR_SYSTEM_ORDER.indexOf(objectId);
  const expected = SOLAR_SYSTEM_ORDER[slotIndex];
  if (expected !== objectId) {
    const direction = slotIndex < correctIndex ? 'farther from the Sun' : 'closer to the Sun';
    return { correct: false, message: `Try a slot ${direction}.`, state };
  }

  const placed = [...state.placed, objectId];
  return {
    correct: true,
    message: `${SOLAR_ORDER_NAMES[objectId]} is in the correct place!`,
    state: { ...state, placed, complete: placed.length === SOLAR_SYSTEM_ORDER.length },
  };
};
