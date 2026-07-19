import { describe, expect, it } from 'vitest';
import { prepareSpeechText } from './Speech';

describe('speech pronunciation', () => {
  it('provides a speech-friendly pronunciation for Makemake', () => {
    expect(prepareSpeechText('Makemake is beyond Neptune.')).toBe(
      'MAH kee MAH kee is beyond Neptune.',
    );
  });

  it('pronounces every occurrence while preserving possessives', () => {
    expect(prepareSpeechText("Makemake and Makemake's moon")).toBe(
      "MAH kee MAH kee and MAH kee MAH kee's moon",
    );
  });

  it('provides a speech-friendly pronunciation for Haumea', () => {
    expect(prepareSpeechText('Haumea has a stretched shape.')).toBe(
      'how MAY uh has a stretched shape.',
    );
  });

  it('does not alter visible source text or unrelated words', () => {
    const text = 'Pluto has a moon named Charon.';
    expect(prepareSpeechText(text)).toBe(text);
  });
});
