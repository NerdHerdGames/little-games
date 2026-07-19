const SPOKEN_PRONUNCIATIONS: readonly [pattern: RegExp, replacement: string][] = [
  [/\bMakemake\b/gi, 'MAH kee MAH kee'],
  [/\bHaumea\b/gi, 'how MAY uh'],
];

export const prepareSpeechText = (text: string): string =>
  SPOKEN_PRONUNCIATIONS.reduce(
    (prepared, [pattern, replacement]) => prepared.replace(pattern, replacement),
    text,
  );

export const speak = (text: string, muted: boolean): boolean => {
  if (muted || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(prepareSpeechText(text));
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
  return true;
};

export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};
