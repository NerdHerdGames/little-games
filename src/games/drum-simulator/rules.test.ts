import { describe, expect, it } from 'vitest';
import { DRUMS, RHYTHMS, startRhythm, strikeRhythm } from './rules';

describe('Drum Simulator rhythms', () => {
  it('keeps progress when another drum is explored and accepts repeated strikes separately', () => {
    const rhythm = RHYTHMS.find((rhythm) => rhythm.id === 'tom-trail')!;
    const start = startRhythm();
    expect(strikeRhythm(rhythm, start, 'snare')).toBe(start);
    const first = strikeRhythm(rhythm, start, 'high-tom');
    expect(first).toEqual({ played: 1, complete: false });
    expect(strikeRhythm(rhythm, first, 'low-tom')).toBe(first);
    expect(strikeRhythm(rhythm, first, 'high-tom').played).toBe(2);
    expect(start.played).toBe(0);
  });

  it.each(RHYTHMS)('completes $name, permits more playing, and restarts cleanly', (rhythm) => {
    let progress = startRhythm();
    for (const [index, drum] of rhythm.steps.entries()) {
      expect(DRUMS.some((definition) => definition.id === drum)).toBe(true);
      progress = strikeRhythm(rhythm, progress, drum);
      expect(progress.played).toBe(index + 1);
      expect(progress.complete).toBe(index === rhythm.steps.length - 1);
    }
    expect(strikeRhythm(rhythm, progress, rhythm.steps[0]!)).toBe(progress);
    expect(startRhythm()).toEqual({ played: 0, complete: false });
  });
});
