import { describe, expect, it } from 'vitest';
import {
  getSongKey,
  getSongKeyboard,
  noteFrequency,
  PIANO_KEYS,
  playNote,
  startSong,
} from './rules';
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
    expect(playNote(song, start, 60)).toBe(start);
    const next = playNote(song, start, 64);
    expect(next).toEqual({ row: 0, note: 1, played: 1, complete: false });
    expect(playNote(song, next, 64).note).toBe(2);
    expect(start.played).toBe(0);
  });

  it('lays out Twinkle in a chromatic C4–B4 octave with correctly placed black keys', () => {
    const song = SONGS.find((song) => song.id === 'twinkle')!;
    const { keys, whiteKeyUnits } = getSongKeyboard(song);
    expect(keys.map((key) => key.midi)).toEqual(Array.from({ length: 12 }, (_, i) => 60 + i));
    expect(keys.filter((key) => 'white' in key).map((key) => key.note)).toEqual([
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
    expect(song.rows[0]!.map((note) => getSongKey(song, note.key)!.midi)).toEqual([
      60, 60, 67, 67, 69, 69, 67,
    ]);
    expect(song.rows.flat().every((note) => 'white' in getSongKey(song, note.key)!)).toBe(true);
  });

  it('uses C–B for free play and preserves song ranges and note colors when switching', () => {
    const halloween = SONGS.find((song) => song.id === 'halloween')!;
    const twinkle = SONGS.find((song) => song.id === 'twinkle')!;
    const lower = getSongKeyboard(halloween);
    const upper = getSongKeyboard(twinkle);
    expect(getSongKey(halloween, 'A')?.midi).toBe(57);
    expect(getSongKey(twinkle, 'A')?.midi).toBe(69);
    expect(getSongKeyboard().keys.map((key) => key.midi)).toEqual(
      Array.from({ length: 12 }, (_, i) => 60 + i),
    );
    expect(getSongKeyboard(halloween)).toBe(lower);
    for (const key of upper.keys) {
      expect(key.color).toBe(getSongKey(halloween, key.note)?.color);
    }
  });

  it('shows complete three–two–three black-key groups around Halloween’s notes', () => {
    const song = SONGS.find((song) => song.id === 'halloween')!;
    const { keys, range, whiteKeyUnits } = getSongKeyboard(song);
    expect(range).toBe('F3 – B4');
    expect(keys.map((key) => key.midi)).toEqual(Array.from({ length: 19 }, (_, i) => 53 + i));
    expect(new Set(keys.map((key) => key.midi)).size).toBe(19);
    expect(keys.flatMap((key) => ('white' in key ? [key.white] : []))).toEqual(
      Array.from({ length: 11 }, (_, i) => i),
    );
    expect(keys.flatMap((key) => ('after' in key ? [key.after] : []))).toEqual([
      0, 1, 2, 4, 5, 7, 8, 9,
    ]);
    expect(whiteKeyUnits).toBe(11);
    expect(keys.filter((key) => !key.supplemental).map((key) => key.midi)).toEqual(
      PIANO_KEYS.map((key) => key.midi),
    );
    for (const key of keys.filter((key) => key.supplemental)) {
      expect(key.color).toBe('#d4d7d4');
      expect(key.midi < 57 || key.midi > 68).toBe(true);
    }
  });

  it('lets extra octave keys be explored without advancing a matching song note', () => {
    const song = SONGS.find((song) => song.id === 'halloween')!;
    const keyboard = getSongKeyboard(song);
    const upperA = keyboard.keys.find((key) => key.midi === 69)!;
    const songA = getSongKey(song, 'A')!;
    expect(upperA.note).toBe(songA.note);
    expect(upperA.supplemental).toBe(true);
    const notes = song.rows.flat();
    const firstA = notes.findIndex((note) => note.key === 'A');
    expect(firstA).toBeGreaterThanOrEqual(0);
    let state = startSong();
    for (const note of notes.slice(0, firstA)) {
      state = playNote(song, state, getSongKey(song, note.key)!.midi);
    }
    expect(playNote(song, state, upperA.midi)).toBe(state);
    expect(playNote(song, state, songA.midi).played).toBe(state.played + 1);
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
          const key = getSongKey(song, note.key)!;
          expect(keyboard.keys).toContain(key);
          expect(key.supplemental).toBe(false);
          state = playNote(song, state, key.midi);
          expect(state.played).toBe(++played);
        }
      }
      expect(state.complete).toBe(true);
      expect(state.row).toBe(song.rows.length - 1);
      expect(state.note).toBe(song.rows.at(-1)!.length);
      expect(playNote(song, state, 64)).toBe(state);
      expect(startSong()).toEqual({ row: 0, note: 0, played: 0, complete: false });
    },
  );
});
