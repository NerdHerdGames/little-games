import { AudioSession } from '../../core/AudioSession';
import type { RunEvent } from './PhysicsWorld';

export class AudioManager {
  volume = 0.5;
  music = false;
  private voices = new Set<OscillatorNode>();
  private readonly session: AudioSession;
  private lastImpact = 0;
  private lastNote = 0;
  private lastRolling = 0;
  private musicTime = 0;
  private musicNote = 0;
  constructor(root: HTMLElement, muted: () => boolean) {
    this.session = new AudioSession(
      root,
      muted,
      () => {},
      () => {
        for (const voice of this.voices) voice.stop();
        this.voices.clear();
      },
    );
  }
  play(event: RunEvent): void {
    const now = performance.now();
    if (event.kind === 'impact') {
      if (now - this.lastImpact < 120) return;
      this.lastImpact = now;
    } else if (event.kind === 'bell' || event.kind === 'drum') {
      if (now - this.lastNote < 60) return;
      this.lastNote = now;
    }
    this.tone(
      event.note,
      event.kind === 'impact' ? 0.014 : 0.07,
      event.kind === 'drum' ? 0.13 : event.kind === 'impact' ? 0.06 : 0.4,
      event.kind === 'drum' ? 'triangle' : 'sine',
    );
    if (event.kind === 'finish') {
      this.tone(event.note + 4, 0.04, 0.4, 'sine', 0.12);
      this.tone(event.note + 7, 0.03, 0.5, 'sine', 0.24);
    }
  }
  tick(seconds: number, rolling: boolean): void {
    const now = performance.now();
    if (rolling && now - this.lastRolling > 300) {
      this.lastRolling = now;
      this.tone(29, 0.008, 0.25, 'triangle');
    }
    this.musicTime += seconds;
    if (this.music && this.musicTime > 0.6) {
      this.musicTime = 0;
      this.tone([60, 64, 67, 72, 67, 64, 62, 67][this.musicNote++ % 8]!, 0.015, 0.4, 'sine');
    }
  }
  private tone(
    note: number,
    volume: number,
    duration: number,
    type: OscillatorType,
    delay = 0,
  ): void {
    if (this.volume === 0) return;
    this.session.play((context) => {
      if (this.voices.size >= 12) return;
      const oscillator = context.createOscillator(),
        gain = context.createGain(),
        at = context.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * this.volume), at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(context.destination);
      this.voices.add(oscillator);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.02);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
  silence(): void {
    this.session.silence();
  }
  dispose(): void {
    this.session.destroy();
  }
}
