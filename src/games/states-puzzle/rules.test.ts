import { describe, expect, it } from 'vitest';
import { getState, STATES, type StateShape } from './data';
import { containsPoint, createStatesPuzzle, placeState, stateAtPoint } from './rules';

describe('United States puzzle', () => {
  it('provides exactly the 50 states with unique names, ids, and abbreviations', () => {
    expect(STATES).toHaveLength(50);
    for (const key of ['id', 'name', 'abbreviation'] as const) {
      expect(new Set(STATES.map((state) => state[key])).size).toBe(50);
    }
    expect(STATES.some(({ name }) => name === 'District of Columbia')).toBe(false);
    expect(STATES.some(({ name }) => name === 'Alaska')).toBe(true);
    expect(STATES.some(({ name }) => name === 'Hawaii')).toBe(true);
  });

  it('decodes usable paths, label centers, and finite bounds for every state', () => {
    for (const state of STATES) {
      expect(state.path).toMatch(/^M.+Z$/);
      expect(state.bounds.width).toBeGreaterThan(0);
      expect(state.bounds.height).toBeGreaterThan(0);
      expect(state.bounds.x).toBeGreaterThan(-65);
      expect(state.bounds.x + state.bounds.width).toBeLessThan(975);
      expect(state.bounds.y).toBeGreaterThan(0);
      expect(state.bounds.y + state.bounds.height).toBeLessThan(640);
      expect(containsPoint(state, state.center), state.name).toBe(true);
      expect(stateAtPoint(state.center, state.id), state.name).toBe(state.id);
    }
  });

  it('shuffles a complete deck without duplicate or missing states', () => {
    const first = createStatesPuzzle(() => 0);
    const second = createStatesPuzzle(() => 0.99);
    expect(new Set(first.order).size).toBe(50);
    expect([...first.order].sort()).toEqual(STATES.map(({ id }) => id).sort());
    expect(first.order).not.toEqual(second.order);
    expect(first.placed).toEqual([]);
    expect(first.current).toBe(first.order[0]);
  });

  it('keeps progress and the current piece on wrong or absent drops and ignores stale drops', () => {
    const puzzle = createStatesPuzzle(() => 0);
    const current = puzzle.current!;
    const other = puzzle.order[1]!;
    for (const [piece, slot] of [
      [current, other],
      [current, undefined],
      [other, other],
      ['invalid', 'invalid'],
    ]) {
      const result = placeState(puzzle, piece!, slot);
      expect(result.correct).toBe(false);
      expect(result.puzzle.placed).toEqual(puzzle.placed);
      expect(result.puzzle.current).toBe(puzzle.current);
      expect(result.puzzle.failedAttempts).toBe(piece === current ? 1 : 0);
    }
  });

  it('snaps each matching state once and completes after all 50', () => {
    let puzzle = createStatesPuzzle(() => 0.5);
    for (let count = 1; count <= 50; count++) {
      const current = puzzle.current!;
      const result = placeState(puzzle, current, current);
      expect(result.correct).toBe(true);
      expect(result.puzzle.placed).toHaveLength(count);
      expect(puzzle.placed).toHaveLength(count - 1);
      puzzle = result.puzzle;
      expect(placeState(puzzle, current, current).correct).toBe(false);
      expect(puzzle.complete).toBe(count === 50);
    }
    expect(puzzle.current).toBeUndefined();
  });

  it('rejects distant drops and invalid coordinates but favors the current state nearby', () => {
    const colorado = STATES.find(({ name }) => name === 'Colorado')!;
    const utah = STATES.find(({ name }) => name === 'Utah')!;
    expect(stateAtPoint({ x: -200, y: -200 }, colorado.id, 12)).toBeUndefined();
    expect(stateAtPoint({ x: NaN, y: 20 }, colorado.id)).toBeUndefined();
    expect(stateAtPoint(colorado.center, utah.id, 12)).toBe(colorado.id);
    expect(stateAtPoint({ x: colorado.center.x - 75, y: colorado.center.y }, colorado.id, 80)).toBe(
      colorado.id,
    );
    const california = STATES.find(({ name }) => name === 'California')!;
    expect(stateAtPoint(california.center, colorado.id, 80)).toBe(california.id);
    expect(
      placeState(
        createStatesPuzzle(() => 0),
        utah.id,
        colorado.id,
      ).correct,
    ).toBe(false);
    expect(getState('invalid')).toBeUndefined();
  });

  it('automatically places the current state on the fifth unsuccessful attempt', () => {
    let puzzle = createStatesPuzzle(() => 0.5);
    const piece = puzzle.current!;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const result = placeState(puzzle, piece, undefined);
      expect(result.correct).toBe(attempt === 5);
      expect(result.assisted).toBe(attempt === 5);
      expect(result.puzzle.failedAttempts).toBe(attempt === 5 ? 0 : attempt);
      expect(result.puzzle.placed).toHaveLength(attempt === 5 ? 1 : 0);
      puzzle = result.puzzle;
    }
    expect(puzzle.current).not.toBe(piece);
    expect(placeState(puzzle, puzzle.current!, undefined).puzzle.failedAttempts).toBe(1);
    expect(placeState(puzzle, piece, undefined).puzzle).toBe(puzzle);
  });

  it('resets failed attempts after an ordinary match and on replay', () => {
    const initial = createStatesPuzzle(() => 0.5);
    const missed = placeState(initial, initial.current!, initial.order[1]).puzzle;
    const matched = placeState(missed, missed.current!, missed.current);
    expect(matched.assisted).toBe(false);
    expect(matched.puzzle.failedAttempts).toBe(0);
    expect(initial.failedAttempts).toBe(0);
    expect(createStatesPuzzle().failedAttempts).toBe(0);
  });

  it('can finish the puzzle by automatically placing its last state', () => {
    let puzzle = createStatesPuzzle(() => 0.5);
    while (puzzle.placed.length < 49)
      puzzle = placeState(puzzle, puzzle.current!, puzzle.current).puzzle;
    const last = puzzle.current!;
    for (let attempt = 0; attempt < 5; attempt++)
      puzzle = placeState(puzzle, last, undefined).puzzle;
    expect(puzzle.complete).toBe(true);
    expect(puzzle.placed).toHaveLength(50);
    expect(puzzle.failedAttempts).toBe(0);
    expect(placeState(puzzle, last, undefined).puzzle).toBe(puzzle);
  });

  it('tests disconnected islands and excludes polygon holes', () => {
    const ring = (x: number, y: number, size: number) => [
      { x, y },
      { x: x + size, y },
      { x: x + size, y: y + size },
      { x, y: y + size },
      { x, y },
    ];
    const shape: StateShape = {
      ...STATES[0]!,
      rings: [ring(0, 0, 20), ring(5, 5, 5), ring(40, 0, 10)],
    };
    expect(containsPoint(shape, { x: 2, y: 2 })).toBe(true);
    expect(containsPoint(shape, { x: 7, y: 7 })).toBe(false);
    expect(containsPoint(shape, { x: 45, y: 5 })).toBe(true);
    expect(containsPoint(shape, { x: 30, y: 5 })).toBe(false);
  });
});
