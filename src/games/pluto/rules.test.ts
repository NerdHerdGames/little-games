import { describe, expect, it } from 'vitest';
import { placePuzzlePiece } from '../puzzle/rules';
import { createPlutoPuzzle, PLUTO_PIECES } from './rules';

describe("Pluto's Heart Puzzle rules", () => {
  it('places a piece only in its correct target', () => {
    const result = placePuzzlePiece(createPlutoPuzzle(), 'north-west', 'heart-north-west');
    expect(result.correct).toBe(true);
    expect(result.newlyPlaced).toBe(true);
    expect(result.state.placedIds.has('north-west')).toBe(true);
  });

  it('keeps all progress after an incorrect placement', () => {
    const first = placePuzzlePiece(createPlutoPuzzle(), 'north-west', 'heart-north-west').state;
    const wrong = placePuzzlePiece(first, 'north-east', 'heart-south-west');
    expect(wrong.correct).toBe(false);
    expect(wrong.state).toBe(first);
    expect(wrong.state.placedIds.has('north-west')).toBe(true);
  });

  it('completes after every piece is correctly placed', () => {
    let state = createPlutoPuzzle();
    for (const piece of PLUTO_PIECES)
      state = placePuzzlePiece(state, piece.id, piece.targetId).state;
    expect(state.complete).toBe(true);
    expect(state.placedIds.size).toBe(5);
  });
});
