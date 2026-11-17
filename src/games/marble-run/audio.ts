import { AudioSession } from '../../core/AudioSession';
import { preferences } from '../../core/services';
import { noteFrequency, type PhysicsFeedback } from './physics';
export class RunAudio {
  private session: AudioSession;
  private voices = new Set<OscillatorNode>();
  private last = 0;
  private lastRoll = 0;
  volume = 0.5;
  constructor(root: HTMLElement) {
    this.session = new AudioSession(
      root,
      () => preferences.current.muted,
      () => {},
      () => this.stop(),
    );
  }
  feedback(event: PhysicsFeedback): void {
    if (event.kind === 'roll') {
      const now = performance.now();
      if (now - this.lastRoll < 180 || now - this.last < 100) return;
      this.lastRoll = now;
      this.tone(90, 0.12, 0.008);
      return;
    }
    const now = performance.now(),
      musical = event.kind === 'note' || event.kind === 'drum';
    if (now - this.last < (musical ? 65 : 130)) return;
    this.last = now;
    const frequency =
      event.kind === 'note'
        ? noteFrequency(event.piece?.props.note ?? 0)
        : event.kind === 'finish'
          ? 880
          : event.kind === 'collect'
            ? 660
            : event.kind === 'drum'
              ? 100
              : event.kind === 'hit'
                ? 150
                : 440;
    this.tone(
      frequency,
      musical ? 0.45 : event.kind === 'hit' ? 0.06 : 0.2,
      event.kind === 'hit' ? 0.025 : 0.08,
    );
  }
  click(): void {
    this.tone(480, 0.08, 0.04);
  }
  private tone(frequency: number, duration: number, volume: number): void {
    this.session.play((context) => {
      if (this.voices.size >= 8) return;
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.85,
        context.currentTime + duration,
      );
      gain.gain.setValueAtTime(Math.max(0.0001, volume * this.volume), context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      this.voices.add(oscillator);
      oscillator.start();
      oscillator.stop(context.currentTime + duration + 0.02);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
  private stop(): void {
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
  }
  destroy(): void {
    this.session.destroy();
  }
}
