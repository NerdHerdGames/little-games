import { AudioSession } from '../core/AudioSession';
import type { Drum } from '../games/drum-simulator/rules';

const STRIKE_GAIN: Record<Drum['voice'], number> = {
  kick: 1.2,
  tom: 1.2,
  snare: 0.7,
  cymbal: 0.28,
};

/** Gentle local percussion, unlocked by a user gesture and bounded by a master compressor. */
export class DrumAudio {
  private readonly session: AudioSession;
  private output: GainNode | undefined;
  private noise: AudioBuffer | undefined;
  private drumWave: PeriodicWave | undefined;
  private kickWave: PeriodicWave | undefined;
  private readonly voices = new Set<AudioScheduledSourceNode>();

  constructor(root: HTMLElement, muted: () => boolean) {
    this.session = new AudioSession(
      root,
      muted,
      (context) => {
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 8;
        this.output = context.createGain();
        this.output.gain.value = 0.35;
        this.output.connect(compressor).connect(context.destination);
        // Give bass drums audible upper harmonics as well as their low fundamental.
        this.drumWave = context.createPeriodicWave(
          new Float32Array(5),
          new Float32Array([0, 1, 0.8, 0.45, 0.25]),
        );
        // A bass-heavy kick with just enough upper tone to retain its attack.
        this.kickWave = context.createPeriodicWave(
          new Float32Array(5),
          new Float32Array([0, 1, 0.35, 0.12, 0.05]),
        );
        this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      },
      () => this.stopVoices(),
    );
  }

  play(drum: Drum): void {
    this.session.play((context) => this.strike(context, drum));
  }

  private strike(context: AudioContext, drum: Drum): void {
    if (!this.output) return;
    // Bound rapid multi-touch playing on slower tablets.
    if (this.voices.size >= 24) {
      const oldest = this.voices.values().next().value!;
      oldest.stop();
      this.voices.delete(oldest);
    }
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(STRIKE_GAIN[drum.voice], now + 0.004);
    if (drum.voice === 'kick' || drum.voice === 'tom') {
      // Keep a fuller body after the attack instead of immediately fading into low bass.
      gain.gain.exponentialRampToValueAtTime(STRIKE_GAIN[drum.voice] * 0.55, now + 0.08);
    }
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
      source.setPeriodicWave((drum.voice === 'kick' ? this.kickWave : this.drumWave)!);
      source.frequency.setValueAtTime(drum.frequency, now);
      source.frequency.exponentialRampToValueAtTime(
        drum.frequency * (drum.voice === 'kick' ? 0.5 : 0.8),
        now + 0.08,
      );
      filter.type = 'lowpass';
      filter.frequency.value = drum.voice === 'kick' ? 700 : 1800;
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
    this.output = undefined;
    this.noise = undefined;
    this.drumWave = undefined;
    this.kickWave = undefined;
  }
}
