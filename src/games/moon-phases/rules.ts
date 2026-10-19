export const MOON_PHASES = [
  { id: 'new', name: 'New Moon', lines: ['New', 'Moon'], fact: 'The side facing us is dark.' },
  {
    id: 'waxing-crescent',
    name: 'Waxing Crescent',
    lines: ['Waxing', 'Crescent'],
    fact: 'A small bright sliver is growing.',
  },
  {
    id: 'first-quarter',
    name: 'First Quarter',
    lines: ['First', 'Quarter'],
    fact: 'The right half looks bright.',
  },
  {
    id: 'waxing-gibbous',
    name: 'Waxing Gibbous',
    lines: ['Waxing', 'Gibbous'],
    fact: 'More than half looks bright, and the light is growing.',
  },
  {
    id: 'full',
    name: 'Full Moon',
    lines: ['Full', 'Moon'],
    fact: 'The whole side facing us looks bright.',
  },
  {
    id: 'waning-gibbous',
    name: 'Waning Gibbous',
    lines: ['Waning', 'Gibbous'],
    fact: 'More than half looks bright, and the light is shrinking.',
  },
  {
    id: 'last-quarter',
    name: 'Last Quarter',
    lines: ['Last', 'Quarter'],
    fact: 'The left half looks bright.',
  },
  {
    id: 'waning-crescent',
    name: 'Waning Crescent',
    lines: ['Waning', 'Crescent'],
    fact: 'A small bright sliver is shrinking. Next comes New Moon!',
  },
] as const;

export type MoonPhaseId = (typeof MOON_PHASES)[number]['id'];
export const getMoonPhase = (id: string) => MOON_PHASES.find((phase) => phase.id === id);

export interface MoonPuzzle {
  order: readonly MoonPhaseId[];
  placed: readonly MoonPhaseId[];
  current: MoonPhaseId | undefined;
  complete: boolean;
}

export function createMoonPuzzle(random: () => number = Math.random): MoonPuzzle {
  const order = MOON_PHASES.map(({ id }) => id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { order, placed: [], current: order[0], complete: false };
}

/** Reference layout: new at left, waxing below Earth, full at right, waning above. */
export function moonSlot(index: number): { x: number; y: number } {
  const angle = Math.PI - (index * Math.PI) / 4;
  return { x: 600 + Math.cos(angle) * 290, y: 450 + Math.sin(angle) * 290 };
}

export function moonSlotAtPoint(
  point: { x: number; y: number },
  tolerance = 0,
): MoonPhaseId | undefined {
  if (![point.x, point.y, tolerance].every(Number.isFinite)) return undefined;
  // A capped margin keeps adjacent slots separate even on a small screen.
  const margin = Math.min(20, Math.max(0, tolerance));
  return MOON_PHASES.find((_phase, index) => {
    const slot = moonSlot(index);
    return Math.hypot(point.x - slot.x, point.y - slot.y) <= 78 + margin;
  })?.id;
}

export function placeMoonPhase(
  puzzle: MoonPuzzle,
  pieceId: string,
  slotId: string | undefined,
): {
  puzzle: MoonPuzzle;
  correct: boolean;
  message: string;
} {
  const phase = getMoonPhase(pieceId);
  if (!phase || puzzle.complete || pieceId !== puzzle.current)
    return { puzzle, correct: false, message: 'Choose the moon in your tray.' };
  if (pieceId !== slotId)
    return {
      puzzle,
      correct: false,
      message: 'Try another spot. Match the name, or show picture hints!',
    };
  const placed = [...puzzle.placed, phase.id];
  const current = puzzle.order[placed.length];
  return {
    puzzle: { ...puzzle, placed, current, complete: current === undefined },
    correct: true,
    message: current
      ? `${phase.name} fits! ${phase.fact}`
      : 'You matched all eight phases of the Moon!',
  };
}
