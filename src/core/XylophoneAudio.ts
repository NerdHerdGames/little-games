import { AudioSession } from './AudioSession';

/** Local mallet tones with a short upper partial and a softly decaying fundamental. */
export class XylophoneAudio {
  private readonly session: AudioSession;
  private output: GainNode | undefined;
  private readonly voices = new Set<() => void>();

  constructor(root: HTMLElement, muted: () => boolean) {
    this.session = new AudioSession(
      root,
      muted,
      (context) => {
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 8;
        this.output = context.createGain();
        this.output.gain.value = 0.3;
        this.output.connect(compressor).connect(context.destination);
      },
      () => this.stopVoices(),
    );
  }

  play(midi: number): void {
    this.session.play((context) => this.strike(context, midi));
  }

  private strike(context: AudioContext, midi: number): void {
    if (!this.output) return;
    // Limit simultaneous notes on slower tablets, including rapid repeated strikes.
    if (this.voices.size >= 12) this.voices.values().next().value?.();
    const sources: OscillatorNode[] = [];
    const stop = (): void => {
      for (const source of sources) source.stop();
      this.voices.delete(stop);
    };
    const now = context.currentTime;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (const [ratio, volume, decay] of [
      [1, 0.48, 0.6],
      [3, 0.12, 0.12],
    ] as const) {
      const source = context.createOscillator();
      const gain = context.createGain();
      source.type = 'sine';
      source.frequency.value = frequency * ratio;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      source.connect(gain).connect(this.output);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (ratio === 1) this.voices.delete(stop);
      };
      source.start(now);
      source.stop(now + decay + 0.02);
      sources.push(source);
    }
    this.voices.add(stop);
  }

  private stopVoices(): void {
    for (const stop of this.voices) stop();
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
    this.output = undefined;
  }
}
