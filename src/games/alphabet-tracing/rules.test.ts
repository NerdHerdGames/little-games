import { describe, expect, it } from 'vitest';
import { LETTERS } from './letters';
import { nextLetterIndex, pointAt, startTrace, strokeLength, tracePoint } from './rules';

describe('alphabet tracing', () => {
  it('offers each uppercase letter once with a name, sound, and drawable strokes', () => {
    expect(LETTERS.map(({ letter }) => letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    for (const letter of LETTERS) {
      expect(letter.name).toBeTruthy();
      expect(letter.sound).toBeTruthy();
      for (const stroke of letter.strokes) {
        expect(strokeLength(stroke)).toBeGreaterThan(60);
        expect(stroke.every((p) => p.x > 25 && p.x < 375 && p.y > 25 && p.y < 375)).toBe(true);
      }
    }
  });

  it.each(LETTERS.map((letter) => [letter.letter, letter] as const))(
    'completes %s by following every stroke in order',
    (_, letter) => {
      let state = startTrace();
      for (const [index, stroke] of letter.strokes.entries()) {
        expect(state.stroke).toBe(index);
        state = tracePoint(letter, state, stroke[0]!, 'start');
        expect(state.drawing).toBe(true);
        const length = strokeLength(stroke);
        for (let d = 4; d < length; d += 4)
          state = tracePoint(letter, state, pointAt(stroke, d), 'move');
        state = tracePoint(letter, state, stroke.at(-1)!, 'move');
        expect(state.stroke).toBe(index + 1);
        expect(state.drawing).toBe(false);
      }
      expect(state.complete).toBe(true);
    },
  );

  it('rejects reversed starts, endpoint jumps, and later strokes', () => {
    const letter = LETTERS[0]!;
    const first = letter.strokes[0]!;
    let state = tracePoint(letter, startTrace(), first.at(-1)!, 'start');
    expect(state.drawing).toBe(false);
    state = tracePoint(letter, state, first[0]!, 'start');
    state = tracePoint(letter, state, first.at(-1)!, 'move');
    expect(state.distance).toBe(0);
    expect(state.complete).toBe(false);
    expect(tracePoint(letter, state, letter.strokes[2]![0]!, 'start').drawing).toBe(false);
  });

  it('keeps progress after leaving the path or lifting, and resumes at the last point', () => {
    const letter = LETTERS[0]!;
    const stroke = letter.strokes[0]!;
    let state = tracePoint(letter, startTrace(), stroke[0]!, 'start');
    state = tracePoint(letter, state, pointAt(stroke, 30), 'move');
    const saved = state.distance;
    expect(saved).toBeGreaterThan(0);
    state = tracePoint(letter, state, { x: 390, y: 390 }, 'move');
    expect(state.drawing).toBe(false);
    expect(state.distance).toBe(saved);
    state = tracePoint(letter, state, pointAt(stroke, saved), 'start');
    expect(state.drawing).toBe(true);
    state = tracePoint(letter, state, { x: 0, y: 0 }, 'end');
    expect(state.distance).toBe(saved);
    expect(state.drawing).toBe(false);
  });

  it('returns from Z to A and starts a fresh trace', () => {
    expect(nextLetterIndex(0)).toBe(1);
    expect(nextLetterIndex(25)).toBe(0);
    expect(startTrace()).toEqual({ stroke: 0, distance: 0, drawing: false, complete: false });
  });
});
