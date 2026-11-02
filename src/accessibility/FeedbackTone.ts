import { AudioSession } from '../core/AudioSession';

let session: AudioSession | undefined;
let activeVoices = new Set<OscillatorNode>();

/** One reusable effect context, unlocked before logical gameplay actions run. */
export function initializeFeedbackAudio(root: EventTarget, muted: () => boolean): () => void {
  session?.destroy();
  const voices = new Set<OscillatorNode>();
  const audio = new AudioSession(
    root,
    muted,
    () => {},
    () => {
      for (const voice of voices) voice.stop();
      voices.clear();
    },
  );
  session = audio;
  activeVoices = voices;
  return () => {
    audio.destroy();
    if (session === audio) session = undefined;
  };
}

export const playPlacementTone = (muted: boolean): void => {
  if (muted) return;
  session?.play(playTone);
};

function playTone(context: AudioContext): void {
  if (activeVoices.size >= 8) {
    const oldest = activeVoices.values().next().value!;
    oldest.stop();
    activeVoices.delete(oldest);
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 520;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain).connect(context.destination);
  const voices = activeVoices;
  voices.add(oscillator);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
  oscillator.onended = () => {
    voices.delete(oscillator);
    oscillator.disconnect();
    gain.disconnect();
  };
}
