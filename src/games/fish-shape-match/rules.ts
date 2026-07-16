export const FISH_SHAPES = ['circle', 'square', 'triangle'] as const;
export const FISH_COLORS = ['red', 'green', 'blue'] as const;
export type FishShape = (typeof FISH_SHAPES)[number];
export type FishColor = (typeof FISH_COLORS)[number];

export interface ShapeFish {
  id: string;
  shape: FishShape;
  color: FishColor;
}

export const SHAPE_FISH: readonly ShapeFish[] = FISH_SHAPES.flatMap((shape) =>
  FISH_COLORS.map((color) => ({ id: `${color}-${shape}`, shape, color })),
);

export interface FishShapeMatchState {
  remaining: readonly ShapeFish[];
  target: FishShape | null;
  collected: number;
  complete: boolean;
}

export interface FishShapeResult {
  correct: boolean;
  message: string;
  state: FishShapeMatchState;
}

const chooseTarget = (fish: readonly ShapeFish[], random: () => number): FishShape => {
  const available = FISH_SHAPES.filter((shape) => fish.some((item) => item.shape === shape));
  const index = Math.min(
    available.length - 1,
    Math.floor(Math.max(0, random()) * available.length),
  );
  const target = available[index];
  if (!target) throw new Error('Cannot choose a shape without any available fish.');
  return target;
};

export const createFishShapeMatch = (random: () => number = Math.random): FishShapeMatchState => ({
  remaining: SHAPE_FISH.map((fish) => ({ ...fish })),
  target: chooseTarget(SHAPE_FISH, random),
  collected: 0,
  complete: false,
});

export const matchShapeFish = (
  state: FishShapeMatchState,
  fishId: string,
  random: () => number = Math.random,
): FishShapeResult => {
  const fish = state.remaining.find(({ id }) => id === fishId);
  if (!fish || !state.target || state.complete)
    return { correct: false, message: 'That fish is not available.', state };
  if (fish.shape !== state.target)
    return {
      correct: false,
      message: `Look for a fish with a ${state.target} on it.`,
      state,
    };

  const remaining = state.remaining.filter(({ id }) => id !== fishId);
  const complete = remaining.length === 0;
  return {
    correct: true,
    message: `You found a ${fish.color} ${fish.shape}!`,
    state: {
      remaining,
      target: complete ? null : chooseTarget(remaining, random),
      collected: state.collected + 1,
      complete,
    },
  };
};
