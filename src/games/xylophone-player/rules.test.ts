import { describe, expect, it } from 'vitest';
import { GAMES } from '../registry';
import { getTouchControlProfile } from '../../config/touchControls';
import { BARS, TUNES, startTune, strikeNote } from './rules';

describe('Xylophone Player', () => {
  it('provides an ascending C major octave with unique labels and shortcuts', () => {
    expect(BARS.map((bar) => bar.midi)).toEqual([72, 74, 76, 77, 79, 81, 83, 84]);
    expect(BARS.map((bar) => bar.key)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(new Set(BARS.map((bar) => bar.id)).size).toBe(8);
    expect(new Set(BARS.map((bar) => bar.name)).size).toBe(8);
    for (let index = 1; index < BARS.length; index++) {
      expect(BARS[index]!.length).toBeLessThan(BARS[index - 1]!.length);
    }
  });

  it('is registered with its own scene and uses the instrument as its touch controls', () => {
    expect(GAMES.find((game) => game.id === 'xylophone-player')?.sceneKey).toBe('XylophonePlayer');
    expect(getTouchControlProfile('XylophonePlayer')).toBe('none');
  });

  it('allows exploration without losing progress and counts repeated notes separately', () => {
    const tune = TUNES.find((tune) => tune.id === 'raindrops')!;
    const start = startTune();
    expect(strikeNote(tune, start, 'c')).toBe(start);
    const first = strikeNote(tune, start, 'e');
    expect(first).toEqual({ row: 0, note: 1, played: 1, complete: false });
    expect(strikeNote(tune, first, 'd')).toBe(first);
    expect(strikeNote(tune, first, 'e')).toEqual({ row: 0, note: 2, played: 2, complete: false });
    expect(start.played).toBe(0);
  });

  it('distinguishes the two C bars during guided play', () => {
    const tune = TUNES.find((tune) => tune.id === 'rainbow-walk')!;
    expect(strikeNote(tune, startTune(), 'high-c').played).toBe(0);
    let progress = startTune();
    for (const note of tune.rows.flat().slice(0, -1)) progress = strikeNote(tune, progress, note);
    expect(strikeNote(tune, progress, 'c')).toBe(progress);
    expect(strikeNote(tune, progress, 'high-c').complete).toBe(true);
  });

  it('plays the supplied Jurassic Park phrases with every C in the high octave', () => {
    const tune = TUNES.find((tune) => tune.id === 'jurassic-park')!;
    const phrase = [84, 83, 84, 79, 77];
    expect(
      tune.rows.map((row) => row.map((id) => BARS.find((bar) => bar.id === id)!.midi)),
    ).toEqual([phrase, phrase, phrase, [81, 79, 81, 83, 84]]);
    let progress = startTune();
    for (const note of tune.rows.flat()) {
      if (note === 'high-c') expect(strikeNote(tune, progress, 'c')).toBe(progress);
      progress = strikeNote(tune, progress, note);
    }
    expect(progress).toEqual({ row: 3, note: 5, played: 20, complete: true });
  });

  it('advances only after a full line and keeps the final line visible on completion', () => {
    const tune = TUNES.find((tune) => tune.id === 'jurassic-park')!;
    let progress = startTune();
    for (const [row, notes] of tune.rows.entries()) {
      expect(progress.row).toBe(row);
      expect(progress.note).toBe(0);
      for (const note of notes.slice(0, -1)) {
        progress = strikeNote(tune, progress, note);
        expect(progress.row).toBe(row);
      }
      expect(strikeNote(tune, progress, 'c')).toBe(progress);
      progress = strikeNote(tune, progress, notes.at(-1)!);
      const last = row === tune.rows.length - 1;
      expect(progress.row).toBe(last ? row : row + 1);
      expect(progress.note).toBe(last ? notes.length : 0);
      expect(progress.complete).toBe(last);
    }
  });

  it.each(TUNES)(
    'completes every line of $name, permits more play, and restarts cleanly',
    (tune) => {
      let progress = startTune();
      let played = 0;
      const total = tune.rows.flat().length;
      for (const [row, notes] of tune.rows.entries()) {
        expect(notes.length).toBeGreaterThan(0);
        expect(progress.row).toBe(row);
        expect(progress.note).toBe(0);
        for (const note of notes) {
          expect(BARS.some((bar) => bar.id === note)).toBe(true);
          progress = strikeNote(tune, progress, note);
          expect(progress.played).toBe(++played);
          expect(progress.complete).toBe(played === total);
        }
      }
      expect(progress.row).toBe(tune.rows.length - 1);
      expect(progress.note).toBe(tune.rows.at(-1)!.length);
      expect(strikeNote(tune, progress, 'e')).toBe(progress);
      expect(startTune()).toEqual({ row: 0, note: 0, played: 0, complete: false });
    },
  );
});
