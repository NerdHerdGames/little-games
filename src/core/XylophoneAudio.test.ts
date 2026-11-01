import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XylophoneAudio } from './XylophoneAudio';

const parameter = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

class FakeNode {
  gain = parameter();
  frequency = parameter();
  threshold = parameter();
  ratio = parameter();
  type = '';
  onended: (() => void) | null = null;
  connect = vi.fn((): FakeNode => this);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeContext {
  state = 'running';
  currentTime = 2;
  destination = new FakeNode();
  oscillators: FakeNode[] = [];
  createGain = (): FakeNode => new FakeNode();
  createDynamicsCompressor = (): FakeNode => new FakeNode();
  createOscillator = (): FakeNode => {
    const source = new FakeNode();
    this.oscillators.push(source);
    return source;
  };
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });
  close = vi.fn(() => Promise.resolve());
}

function fixture() {
  const context = new FakeContext();
  const create = vi.fn(function () {
    return context;
  });
  const root = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { AudioContext: create }));
  vi.stubGlobal('document', doc);
  vi.stubGlobal('AudioContext', create);
  let muted = false;
  const audio = new XylophoneAudio(root as HTMLElement, () => muted);
  return {
    context,
    root,
    doc,
    audio,
    create,
    mute: () => {
      muted = true;
    },
  };
}

describe('Xylophone audio lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('unlocks on a gesture and creates pitched, decaying mallet tones', () => {
    const f = fixture();
    f.audio.play(72);
    expect(f.create).not.toHaveBeenCalled();
    f.root.dispatchEvent(new Event('pointerdown'));
    f.audio.play(72);
    expect(f.context.oscillators).toHaveLength(2);
    const [fundamental, partial] = f.context.oscillators;
    expect(fundamental!.frequency.value).toBeCloseTo(523.251, 2);
    expect(partial!.frequency.value).toBeCloseTo(1569.753, 2);
    expect(fundamental!.stop).toHaveBeenCalledWith(2.62);
    fundamental!.onended!();
    partial!.onended!();
    expect(fundamental!.disconnect).toHaveBeenCalledOnce();
    expect(partial!.disconnect).toHaveBeenCalledOnce();
    f.audio.destroy();
  });

  it('bounds rapid polyphony and stops all remaining notes on mute', () => {
    const f = fixture();
    f.root.dispatchEvent(new Event('click'));
    for (let i = 0; i < 13; i++) f.audio.play(72);
    expect(f.context.oscillators[0]!.stop).toHaveBeenCalledTimes(2);
    expect(f.context.oscillators[2]!.stop).toHaveBeenCalledOnce();
    f.mute();
    window.dispatchEvent(new Event('preferenceschange'));
    for (const source of f.context.oscillators) expect(source.stop).toHaveBeenCalledTimes(2);
    expect(f.context.suspend).toHaveBeenCalledOnce();
    f.audio.play(84);
    expect(f.context.oscillators).toHaveLength(26);
    f.audio.destroy();
  });

  it('stays silent while hidden and removes gesture listeners when destroyed', () => {
    const f = fixture();
    window.dispatchEvent(new Event('keydown'));
    f.audio.play(72);
    f.doc.hidden = true;
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.context.suspend).toHaveBeenCalledOnce();
    f.audio.play(84);
    expect(f.context.oscillators).toHaveLength(2);
    f.audio.destroy();
    expect(f.context.close).toHaveBeenCalledOnce();
    f.root.dispatchEvent(new Event('click'));
    window.dispatchEvent(new Event('keydown'));
    expect(f.create).toHaveBeenCalledOnce();
  });

  it('does not create an audio context when the saved preference is muted', () => {
    const f = fixture();
    f.mute();
    f.root.dispatchEvent(new Event('pointerdown'));
    f.root.dispatchEvent(new Event('click'));
    f.audio.play(72);
    expect(f.create).not.toHaveBeenCalled();
    f.audio.destroy();
  });
});
