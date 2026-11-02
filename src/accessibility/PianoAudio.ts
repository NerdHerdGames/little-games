import { AudioSession } from '../core/AudioSession';
import { noteFrequency } from '../games/piano-player/rules';

/** Local synthesized notes; unlock within a device event, then play through logical actions. */
export class PianoAudio {
  private readonly session: AudioSession;
  private readonly voices = new Set<OscillatorNode>();

  constructor(root: HTMLElement, muted: () => boolean) {
    this.session = new AudioSession(
      root,
      muted,
      () => {},
      () => this.stopVoices(),
    );
  }

  play(midi: number): void {
    this.session.play((context) => this.strike(context, midi));
  }

  private strike(context: AudioContext, midi: number): void {
    if (this.voices.size >= 16) {
      const oldest = this.voices.values().next().value!;
      oldest.stop();
      this.voices.delete(oldest);
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.value = noteFrequency(midi);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    oscillator.connect(gain).connect(context.destination);
    this.voices.add(oscillator);
    oscillator.start();
    oscillator.stop(now + 0.7);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  private stopVoices(): void {
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
  }

  retry(): void {
    this.session.retry();
  }

  silence(): void {
    this.session.silence();
  }

  destroy(): void {
    this.session.destroy();
  }
}
