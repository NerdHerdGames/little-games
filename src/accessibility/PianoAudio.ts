import { noteFrequency } from '../games/piano-player/rules';

/** Local synthesized notes; unlock within a device event, then play through logical actions. */
export class PianoAudio {
  private context: AudioContext | undefined;
  private readonly listeners = new AbortController();

  constructor(
    root: HTMLElement,
    private readonly muted: () => boolean,
  ) {
    const unlock = (): void => {
      if (this.muted() || !window.AudioContext) return;
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    };
    root.addEventListener('click', unlock, { signal: this.listeners.signal });
    root.addEventListener('keydown', unlock, { signal: this.listeners.signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.silence();
      },
      { signal: this.listeners.signal },
    );
    window.addEventListener(
      'preferenceschange',
      () => {
        if (this.muted()) this.silence();
      },
      { signal: this.listeners.signal },
    );
  }

  play(midi: number): void {
    if (this.muted() || document.hidden || !this.context) return;
    const context = this.context;
    if (context.state === 'suspended') void context.resume().catch(() => {});
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.value = noteFrequency(midi);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(now + 0.7);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }

  silence(): void {
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }

  destroy(): void {
    this.listeners.abort();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
  }
}
