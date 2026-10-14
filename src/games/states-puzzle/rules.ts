import { getState, STATES, type Point, type StateShape } from './data';

export interface StatesPuzzle {
  order: readonly string[];
  placed: readonly string[];
  current: string | undefined;
  complete: boolean;
  failedAttempts: number;
}

export const AUTO_PLACE_AFTER_ATTEMPTS = 5;

export function createStatesPuzzle(random: () => number = Math.random): StatesPuzzle {
  const order = STATES.map(({ id }) => id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return { order, placed: [], current: order[0], complete: false, failedAttempts: 0 };
}

export function containsPoint(shape: StateShape, point: Point): boolean {
  let inside = false;
  for (const ring of shape.rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]!;
      const b = ring[j]!;
      if (
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
  }
  return inside;
}

function distanceToBorder(shape: StateShape, point: Point): number {
  let distance = Infinity;
  for (const ring of shape.rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i]!;
      const b = ring[i + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
      );
      distance = Math.min(distance, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
    }
  }
  return distance;
}

/** Favor the current piece within a generous margin, including nearby neighboring outlines. */
export function stateAtPoint(point: Point, currentId: string, tolerance = 0): string | undefined {
  if (![point.x, point.y, tolerance].every(Number.isFinite)) return undefined;
  const current = getState(currentId);
  if (
    current &&
    (containsPoint(current, point) || distanceToBorder(current, point) <= Math.max(0, tolerance))
  ) {
    return current.id;
  }
  return STATES.find((shape) => containsPoint(shape, point))?.id;
}

export function placeState(
  puzzle: StatesPuzzle,
  pieceId: string,
  slotId: string | undefined,
): {
  puzzle: StatesPuzzle;
  correct: boolean;
  assisted: boolean;
  message: string;
} {
  const shape = getState(pieceId);
  if (!shape || puzzle.complete || pieceId !== puzzle.current) {
    return {
      puzzle,
      correct: false,
      assisted: false,
      message: 'Try another outline. Your piece is back in the toolbox.',
    };
  }
  const failedAttempts = pieceId === slotId ? puzzle.failedAttempts : puzzle.failedAttempts + 1;
  const assisted = pieceId !== slotId && failedAttempts >= AUTO_PLACE_AFTER_ATTEMPTS;
  if (pieceId !== slotId && !assisted) {
    return {
      puzzle: { ...puzzle, failedAttempts },
      correct: false,
      assisted: false,
      message: 'Try a little closer to its home. You can use Show a hint, too.',
    };
  }
  const placed = [...puzzle.placed, pieceId];
  const current = puzzle.order[placed.length];
  return {
    puzzle: { ...puzzle, placed, current, complete: current === undefined, failedAttempts: 0 },
    correct: true,
    assisted,
    message: assisted
      ? `Let's place ${shape.name} together!${current ? '' : ' All 50 states are home!'}`
      : current
        ? `${shape.name} fits! Here comes another state.`
        : 'You built the whole United States! All 50 states fit.',
  };
}
