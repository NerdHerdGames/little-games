/** Local mallet tones with a short upper partial and a softly decaying fundamental. */
export class XylophoneAudio {
  private context: AudioContext | undefined;
  private output: GainNode | undefined;
  private readonly voices = new Set<() => void>();
  private readonly listeners = new AbortController();

  constructor(
    root: HTMLElement,
    private readonly muted: () => boolean,
  ) {
    const unlock = (): void => {
      if (this.muted() || !window.AudioContext) return;
      if (!this.context) {
        const context = new AudioContext();
        this.context = context;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 8;
        this.output = context.createGain();
        this.output.gain.value = 0.3;
        this.output.connect(compressor).connect(context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    };
    root.addEventListener('pointerdown', unlock, { capture: true, signal: this.listeners.signal });
    root.addEventListener('click', unlock, { capture: true, signal: this.listeners.signal });
    window.addEventListener('keydown', unlock, { capture: true, signal: this.listeners.signal });
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
    const context = this.context;
    if (!context || !this.output || this.muted() || document.hidden) return;
    if (context.state === 'suspended') void context.resume().catch(() => {});
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

  silence(): void {
    for (const stop of this.voices) stop();
    this.voices.clear();
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }

  destroy(): void {
    this.listeners.abort();
    this.silence();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
    this.output = undefined;
  }
}
