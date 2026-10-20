import { describe, expect, it } from 'vitest';
import { getSongKeyboard, noteFrequency, PIANO_KEYS, playNote, startSong } from './rules';
import { SONGS } from './songs';

describe('Piano Player', () => {
  it('provides a chromatic octave matching the reference colors and accidentals', () => {
    expect(PIANO_KEYS.map((key) => key.midi)).toEqual(Array.from({ length: 12 }, (_, i) => 57 + i));
    expect(PIANO_KEYS.filter((key) => 'white' in key)).toHaveLength(7);
    expect(PIANO_KEYS.find((key) => key.id === 'Bb')?.midi).toBe(58);
    expect(PIANO_KEYS.find((key) => key.id === 'Fs')?.midi).toBe(66);
    expect(noteFrequency(69)).toBe(440);
    expect(noteFrequency(60)).toBeCloseTo(261.626, 2);
  });

  it('keeps incorrect notes gentle and requires a separate press for each repeated note', () => {
    const song = SONGS.find((song) => song.id === 'halloween')!;
    const start = startSong();
    expect(playNote(song, start, 'C')).toBe(start);
    const next = playNote(song, start, 'E');
    expect(next).toEqual({ row: 0, note: 1, played: 1, complete: false });
    expect(playNote(song, next, 'E').note).toBe(2);
    expect(start.played).toBe(0);
  });

  it('lays out Twinkle in a chromatic C4–B4 octave with correctly placed black keys', () => {
    const song = SONGS.find((song) => song.id === 'twinkle')!;
    const { keys, whiteKeyUnits } = getSongKeyboard(song);
    expect(keys.map((key) => key.midi)).toEqual(Array.from({ length: 12 }, (_, i) => 60 + i));
    expect(keys.filter((key) => 'white' in key).map((key) => key.id)).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ]);
    expect(keys.flatMap((key) => ('white' in key ? [key.white] : []))).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(keys.flatMap((key) => ('after' in key ? [key.after] : []))).toEqual([0, 1, 3, 4, 5]);
    expect(whiteKeyUnits).toBe(7);
    expect(song.rows[0]!.map((note) => keys.find((key) => key.id === note.key)!.midi)).toEqual([
      60, 60, 67, 67, 69, 69, 67,
    ]);
    expect(
      song.rows.flat().every((note) => 'white' in keys.find((key) => key.id === note.key)!),
    ).toBe(true);
  });

  it('uses C–B for free play and preserves song ranges and note colors when switching', () => {
    const halloween = SONGS.find((song) => song.id === 'halloween')!;
    const twinkle = SONGS.find((song) => song.id === 'twinkle')!;
    const lower = getSongKeyboard(halloween);
    const upper = getSongKeyboard(twinkle);
    expect(lower.keys.find((key) => key.id === 'A')?.midi).toBe(57);
    expect(upper.keys.find((key) => key.id === 'A')?.midi).toBe(69);
    expect(getSongKeyboard().keys.map((key) => key.midi)).toEqual(
      Array.from({ length: 12 }, (_, i) => 60 + i),
    );
    expect(getSongKeyboard(halloween)).toBe(lower);
    for (const key of upper.keys) {
      expect(key.color).toBe(lower.keys.find((entry) => entry.id === key.id)?.color);
    }
  });

  it.each(SONGS)(
    'plays every row of $title exactly once and retains the completed final row',
    (song) => {
      const keyboard = getSongKeyboard(song);
      let state = startSong();
      let played = 0;
      for (const [rowIndex, row] of song.rows.entries()) {
        expect(row.length).toBeGreaterThan(0);
        expect(state.row).toBe(rowIndex);
        expect(state.note).toBe(0);
        for (const note of row) {
          expect(keyboard.keys.some((key) => key.id === note.key)).toBe(true);
          state = playNote(song, state, note.key);
          expect(state.played).toBe(++played);
        }
      }
      expect(state.complete).toBe(true);
      expect(state.row).toBe(song.rows.length - 1);
      expect(state.note).toBe(song.rows.at(-1)!.length);
      expect(playNote(song, state, 'E')).toBe(state);
      expect(startSong()).toEqual({ row: 0, note: 0, played: 0, complete: false });
    },
  );
});
