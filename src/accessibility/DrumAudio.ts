import type { Drum } from '../games/drum-simulator/rules';

/** Gentle local percussion, unlocked by a user gesture and bounded by a master compressor. */
export class DrumAudio {
  private context: AudioContext | undefined;
  private output: GainNode | undefined;
  private noise: AudioBuffer | undefined;
  private readonly voices = new Set<AudioScheduledSourceNode>();
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
        this.output.gain.value = 0.35;
        this.output.connect(compressor).connect(context.destination);
        this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
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

  play(drum: Drum): void {
    const context = this.context;
    if (!context || !this.output || this.muted() || document.hidden) return;
    if (context.state === 'suspended') void context.resume().catch(() => {});
    // Bound rapid multi-touch playing on slower tablets.
    if (this.voices.size >= 24) this.voices.values().next().value?.stop();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(drum.voice === 'cymbal' ? 0.28 : 0.7, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + drum.decay);
    gain.connect(this.output);

    const source =
      drum.voice === 'cymbal' || drum.voice === 'snare'
        ? context.createBufferSource()
        : context.createOscillator();
    const filter = context.createBiquadFilter();
    if (source instanceof AudioBufferSourceNode) {
      source.buffer = this.noise!;
      filter.type = drum.voice === 'snare' ? 'bandpass' : 'highpass';
      filter.frequency.value = drum.voice === 'snare' ? 1800 : drum.frequency;
      filter.Q.value = 0.7;
    } else {
      source.type = 'sine';
      source.frequency.setValueAtTime(drum.frequency, now);
      source.frequency.exponentialRampToValueAtTime(drum.frequency * 0.35, now + drum.decay);
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
    }
    source.connect(filter).connect(gain);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(now);
    source.stop(now + drum.decay + 0.02);
  }

  silence(): void {
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }

  destroy(): void {
    this.listeners.abort();
    this.silence();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
    this.output = undefined;
    this.noise = undefined;
  }
}
