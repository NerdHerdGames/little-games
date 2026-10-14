import { describe, expect, it } from 'vitest';
import { createSolarPuzzle, findPuzzleSlot, PUZZLE_WORLDS, puzzleSlot } from './puzzle';
import { placeSolarObject } from './rules';

describe('2D solar system puzzle', () => {
  it('starts with a fixed Sun and thirteen distinct worlds to place', () => {
    const state = createSolarPuzzle(() => 0.5);
    expect(state.placed).toEqual(['sun']);
    expect(PUZZLE_WORLDS).toHaveLength(13);
    expect(new Set(PUZZLE_WORLDS).size).toBe(13);
    expect(state.complete).toBe(false);
  });

  it('maps every orbit target to the correct distance slot and completes the puzzle', () => {
    let state = createSolarPuzzle();
    PUZZLE_WORLDS.forEach((id, index) => {
      const slot = puzzleSlot(index);
      expect(findPuzzleSlot(slot.x, slot.y)).toBe(index);
      const result = placeSolarObject(state, id, findPuzzleSlot(slot.x, slot.y) + 1);
      expect(result.correct).toBe(true);
      state = result.state;
    });
    expect(state.complete).toBe(true);
  });

  it('leaves the puzzle unchanged after a wrong orbit or a drop outside the board', () => {
    const state = createSolarPuzzle();
    expect(findPuzzleSlot(600, 600)).toBe(-1);
    expect(placeSolarObject(state, 'ceres', 1).state).toBe(state);
    expect(placeSolarObject(state, 'ceres', -1).state).toBe(state);
  });

  it('keeps targets separated so each drop has an unambiguous destination', () => {
    PUZZLE_WORLDS.forEach((_id, index) => {
      const a = puzzleSlot(index);
      PUZZLE_WORLDS.slice(index + 1).forEach((_other, offset) => {
        const b = puzzleSlot(index + offset + 1);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(112);
      });
    });
  });
});
