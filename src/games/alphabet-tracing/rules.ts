import type { Letter, Point } from './letters';

export interface TraceState {
  stroke: number;
  distance: number;
  drawing: boolean;
  complete: boolean;
}
export type TracePhase = 'start' | 'move' | 'end';
export const startTrace = (): TraceState => ({
  stroke: 0,
  distance: 0,
  drawing: false,
  complete: false,
});
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export const strokeLength = (points: readonly Point[]): number =>
  points.reduce((sum, point, i) => sum + (i ? distance(points[i - 1]!, point) : 0), 0);

export const pointAt = (points: readonly Point[], position: number): Point => {
  let remaining = Math.max(0, position);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const length = distance(a, b);
    if (remaining <= length && length > 0)
      return {
        x: a.x + ((b.x - a.x) * remaining) / length,
        y: a.y + ((b.y - a.y) * remaining) / length,
      };
    remaining -= length;
  }
  return points.at(-1)!;
};

/** Advance only along nearby, forward checkpoints. Wrong turns never erase progress. */
export const tracePoint = (
  letter: Letter,
  state: TraceState,
  point: Point,
  phase: TracePhase,
): TraceState => {
  if (phase === 'end') return { ...state, drawing: false };
  if (state.complete || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return state;
  const stroke = letter.strokes[state.stroke]!;
  const current = pointAt(stroke, state.distance);
  const tolerance = 24;
  if (phase === 'start') return { ...state, drawing: distance(current, point) <= tolerance };
  if (!state.drawing) return state;

  const length = strokeLength(stroke);
  // A bounded search prevents jumping directly to an endpoint or across a loop.
  let best = state.distance;
  let closest = distance(current, point);
  const limit = Math.min(length, state.distance + 48);
  for (let candidate = state.distance + 2; candidate <= limit + 1; candidate += 2) {
    const position = Math.min(length, candidate);
    const separation = distance(pointAt(stroke, position), point);
    if (separation < closest) {
      closest = separation;
      best = position;
    }
  }
  if (closest > tolerance) return { ...state, drawing: false };
  if (best >= length - 7 && distance(stroke.at(-1)!, point) <= 14) {
    const next = state.stroke + 1;
    return { stroke: next, distance: 0, drawing: false, complete: next === letter.strokes.length };
  }
  return { ...state, distance: best };
};

export const nextLetterIndex = (index: number): number => (index + 1) % 26;
