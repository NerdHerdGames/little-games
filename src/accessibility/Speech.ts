export const speak = (text: string, muted: boolean): boolean => {
  if (muted || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
  return true;
};

export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};
