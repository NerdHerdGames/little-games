export const PLANET_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;

export type PlanetId = (typeof PLANET_IDS)[number];

export interface PlanetFact {
  planetId: PlanetId;
  text: string;
  hint: string;
}

export const PLANET_FACTS: Readonly<Record<PlanetId, readonly PlanetFact[]>> = {
  mercury: [
    {
      planetId: 'mercury',
      text: 'I am the closest planet to the Sun.',
      hint: 'Try the small planet nearest the Sun.',
    },
    {
      planetId: 'mercury',
      text: 'I am the smallest planet.',
      hint: 'Look for the smallest rocky planet.',
    },
  ],
  venus: [
    {
      planetId: 'venus',
      text: 'I am the hottest planet.',
      hint: 'Look for the cloudy yellow planet.',
    },
    {
      planetId: 'venus',
      text: 'Thick clouds cover my surface.',
      hint: 'Try the planet named after Venus.',
    },
  ],
  earth: [
    {
      planetId: 'earth',
      text: 'Most of my surface is covered by liquid water.',
      hint: 'Look for our blue home planet.',
    },
    {
      planetId: 'earth',
      text: 'People, plants, and animals live on me.',
      hint: 'Choose the planet we call home.',
    },
  ],
  mars: [
    {
      planetId: 'mars',
      text: 'I am called the Red Planet.',
      hint: 'Look for the rusty red planet.',
    },
    {
      planetId: 'mars',
      text: 'I have a giant volcano named Olympus Mons.',
      hint: 'Try the fourth planet from the Sun.',
    },
  ],
  jupiter: [
    {
      planetId: 'jupiter',
      text: 'I am the largest planet.',
      hint: 'Choose the biggest striped planet.',
    },
    {
      planetId: 'jupiter',
      text: 'I have a storm called the Great Red Spot.',
      hint: 'Look for the large planet with colorful bands.',
    },
  ],
  saturn: [
    {
      planetId: 'saturn',
      text: 'Wide, bright rings circle around me.',
      hint: 'Look for the planet with the most visible rings.',
    },
    {
      planetId: 'saturn',
      text: 'My rings are made of ice and rock.',
      hint: 'Choose the pale planet surrounded by rings.',
    },
  ],
  uranus: [
    {
      planetId: 'uranus',
      text: 'I rotate on my side.',
      hint: 'Look for the pale blue-green planet.',
    },
    {
      planetId: 'uranus',
      text: 'Methane gas helps make me look blue-green.',
      hint: 'Try the seventh planet from the Sun.',
    },
  ],
  neptune: [
    {
      planetId: 'neptune',
      text: 'I am the farthest planet from the Sun.',
      hint: 'Choose the last deep-blue planet.',
    },
    {
      planetId: 'neptune',
      text: 'The fastest planetary winds blow on me.',
      hint: 'Look for the dark blue outer planet.',
    },
  ],
};

export interface PlanetFactMatchState {
  remaining: readonly PlanetId[];
  current: PlanetFact | null;
  stars: number;
  complete: boolean;
}

export interface PlanetDropResult {
  correct: boolean;
  hint: string;
  state: PlanetFactMatchState;
}

const pick = <T>(items: readonly T[], random: () => number): T => {
  const index = Math.min(items.length - 1, Math.floor(Math.max(0, random()) * items.length));
  const item = items[index];
  if (!item) throw new Error('Cannot choose from an empty planet fact list.');
  return item;
};

const chooseFact = (remaining: readonly PlanetId[], random: () => number): PlanetFact => {
  const planetId = pick(remaining, random);
  return pick(PLANET_FACTS[planetId], random);
};

export const createPlanetFactMatch = (
  random: () => number = Math.random,
): PlanetFactMatchState => ({
  remaining: [...PLANET_IDS],
  current: chooseFact(PLANET_IDS, random),
  stars: 0,
  complete: false,
});

export const dropPlanetForFact = (
  state: PlanetFactMatchState,
  planetId: PlanetId,
  random: () => number = Math.random,
): PlanetDropResult => {
  if (!state.current || state.complete) return { correct: false, hint: '', state };
  if (planetId !== state.current.planetId)
    return { correct: false, hint: state.current.hint, state };

  const remaining = state.remaining.filter((id) => id !== planetId);
  const complete = remaining.length === 0;
  return {
    correct: true,
    hint: '',
    state: {
      remaining,
      current: complete ? null : chooseFact(remaining, random),
      stars: state.stars + 1,
      complete,
    },
  };
};
