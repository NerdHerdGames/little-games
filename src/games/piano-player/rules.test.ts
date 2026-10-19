import { describe, expect, it } from 'vitest';
import { noteFrequency, PIANO_KEYS, playNote, startSong } from './rules';
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
    const song = SONGS[0]!;
    const start = startSong();
    expect(playNote(song, start, 'C')).toBe(start);
    const next = playNote(song, start, 'E');
    expect(next).toEqual({ row: 0, note: 1, played: 1, complete: false });
    expect(playNote(song, next, 'E').note).toBe(2);
    expect(start.played).toBe(0);
  });

  it.each(SONGS)(
    'plays every row of $title exactly once and retains the completed final row',
    (song) => {
      let state = startSong();
      let played = 0;
      for (const [rowIndex, row] of song.rows.entries()) {
        expect(row.length).toBeGreaterThan(0);
        expect(state.row).toBe(rowIndex);
        expect(state.note).toBe(0);
        for (const note of row) {
          expect(PIANO_KEYS.some((key) => key.id === note.key)).toBe(true);
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
