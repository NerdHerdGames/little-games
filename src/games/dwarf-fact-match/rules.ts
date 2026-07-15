export const DWARF_IDS = ['ceres', 'pluto', 'haumea', 'makemake', 'eris'] as const;
export type DwarfId = (typeof DWARF_IDS)[number];

export interface DwarfFact {
  dwarfId: DwarfId;
  text: string;
  hint: string;
}

export const DWARF_FACTS: Readonly<Record<DwarfId, readonly DwarfFact[]>> = {
  ceres: [
    {
      dwarfId: 'ceres',
      text: 'I am in the asteroid belt.',
      hint: 'Look between Mars and Jupiter.',
    },
    {
      dwarfId: 'ceres',
      text: 'I have bright areas inside some craters.',
      hint: 'Try the closest dwarf planet.',
    },
  ],
  pluto: [
    {
      dwarfId: 'pluto',
      text: 'I have a large heart-shaped region.',
      hint: 'Look for the world with a bright heart.',
    },
    {
      dwarfId: 'pluto',
      text: 'My largest moon is named Charon.',
      hint: 'Try the world visited by New Horizons in 2015.',
    },
  ],
  haumea: [
    {
      dwarfId: 'haumea',
      text: 'I have a stretched shape.',
      hint: 'Look for the oval-shaped world.',
    },
    {
      dwarfId: 'haumea',
      text: 'I spin very quickly.',
      hint: 'Choose the long, fast-spinning world.',
    },
  ],
  makemake: [
    {
      dwarfId: 'makemake',
      text: 'I am part of the Kuiper Belt.',
      hint: 'Look for the reddish world.',
    },
    {
      dwarfId: 'makemake',
      text: 'I have a small known moon.',
      hint: 'Try the reddish world beyond Neptune.',
    },
  ],
  eris: [
    {
      dwarfId: 'eris',
      text: 'I am very far from the Sun.',
      hint: 'Choose the pale, faraway world.',
    },
    {
      dwarfId: 'eris',
      text: 'My moon is named Dysnomia.',
      hint: 'Look for the world similar in size to Pluto.',
    },
  ],
};

export interface DwarfFactMatchState {
  remaining: readonly DwarfId[];
  current: DwarfFact | null;
  stars: number;
  complete: boolean;
}

export interface DwarfDropResult {
  correct: boolean;
  hint: string;
  state: DwarfFactMatchState;
}

const pick = <T>(items: readonly T[], random: () => number): T => {
  const index = Math.min(items.length - 1, Math.floor(Math.max(0, random()) * items.length));
  const item = items[index];
  if (!item) throw new Error('Cannot choose from an empty dwarf planet fact list.');
  return item;
};

const chooseFact = (remaining: readonly DwarfId[], random: () => number): DwarfFact => {
  const dwarfId = pick(remaining, random);
  return pick(DWARF_FACTS[dwarfId], random);
};

export const createDwarfFactMatch = (random: () => number = Math.random): DwarfFactMatchState => ({
  remaining: [...DWARF_IDS],
  current: chooseFact(DWARF_IDS, random),
  stars: 0,
  complete: false,
});

export const dropDwarfForFact = (
  state: DwarfFactMatchState,
  dwarfId: DwarfId,
  random: () => number = Math.random,
): DwarfDropResult => {
  if (!state.current || state.complete) return { correct: false, hint: '', state };
  if (dwarfId !== state.current.dwarfId) return { correct: false, hint: state.current.hint, state };
  const remaining = state.remaining.filter((id) => id !== dwarfId);
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
