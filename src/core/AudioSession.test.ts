import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioSession } from './AudioSession';
import { PianoAudio } from '../accessibility/PianoAudio';
import { DrumAudio } from '../accessibility/DrumAudio';
import { DRUMS } from '../games/drum-simulator/rules';
import { initializeFeedbackAudio, playPlacementTone } from '../accessibility/FeedbackTone';

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
  Q = parameter();
  type = '';
  onended: (() => void) | null = null;
  connect = vi.fn((): FakeNode => this);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  setPeriodicWave = vi.fn();
}

class FakeBufferSource extends FakeNode {}

class FakeContext extends EventTarget {
  state = 'running';
  currentTime = 2;
  sampleRate = 100;
  destination = new FakeNode();
  oscillators: FakeNode[] = [];
  createGain = (): FakeNode => new FakeNode();
  createDynamicsCompressor = (): FakeNode => new FakeNode();
  createPeriodicWave = (): object => ({});
  createBiquadFilter = (): FakeNode => new FakeNode();
  createBuffer = () => ({ getChannelData: () => new Float32Array(100) });
  createOscillator = (): FakeNode => {
    const node = new FakeNode();
    this.oscillators.push(node);
    return node;
  };
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });
  close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });
}

const cleanup: (() => void)[] = [];

function fixture(initialState = 'running') {
  const contexts: FakeContext[] = [];
  const create = vi.fn(function () {
    const context = new FakeContext();
    context.state = initialState;
    contexts.push(context);
    return context;
  });
  const root = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { AudioContext: create }));
  vi.stubGlobal('document', doc);
  vi.stubGlobal('AudioBufferSourceNode', FakeBufferSource);
  let muted = false;
  const mutedValue = () => muted;
  const initialize = vi.fn();
  const stop = vi.fn();
  const audio = new AudioSession(root, mutedValue, initialize, stop);
  cleanup.push(() => audio.destroy());
  return {
    root,
    doc,
    contexts,
    create,
    initialize,
    stop,
    audio,
    mutedValue,
    mute: (value: boolean) => {
      muted = value;
      window.dispatchEvent(new Event('preferenceschange'));
    },
    gesture: (type = 'pointerdown') => root.dispatchEvent(new Event(type)),
    get context() {
      return contexts.at(-1)!;
    },
  };
}

function deferredResume(context: FakeContext) {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  context.resume.mockReturnValue(promise);
  return async () => {
    context.state = 'running';
    resolve();
    await promise;
    await Promise.resolve();
  };
}

afterEach(() => {
  for (const destroy of cleanup.splice(0)) destroy();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('tablet audio activation and recovery', () => {
  it.each(['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'])(
    'initializes inside %s and reuses a single context',
    (type) => {
      const f = fixture();
      const play = vi.fn();
      f.audio.play(play);
      expect(f.create).not.toHaveBeenCalled();
      const target = type === 'keydown' ? window : f.root;
      target.dispatchEvent(new Event(type));
      f.audio.play(play);
      f.gesture();
      f.audio.play(play);
      expect(f.create).toHaveBeenCalledExactlyOnceWith({ latencyHint: 'interactive' });
      expect(play).toHaveBeenCalledTimes(2);
    },
  );

  it('waits for actual startup before scheduling the first note', async () => {
    const f = fixture();
    f.gesture();
    f.context.state = 'suspended';
    const finish = deferredResume(f.context);
    const play = vi.fn();
    f.audio.play(play);
    expect(play).not.toHaveBeenCalled();
    await finish();
    expect(play).toHaveBeenCalledExactlyOnceWith(f.context);
  });

  it('retries at touch release even when an earlier resume is still pending', async () => {
    const f = fixture();
    f.gesture();
    f.context.state = 'suspended';
    const finish = deferredResume(f.context);
    f.gesture();
    f.gesture('touchend');
    expect(f.context.resume).toHaveBeenCalledTimes(2);
    await finish();
  });

  it('resumes interrupted contexts as well as suspended ones', () => {
    const f = fixture('interrupted');
    f.gesture();
    expect(f.context.resume).toHaveBeenCalledOnce();
    expect(f.context.state).toBe('running');
  });

  it('recovers on return without creating contexts on background events', () => {
    const f = fixture();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    expect(f.create).not.toHaveBeenCalled();
    f.gesture();
    f.doc.hidden = true;
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.context.suspend).toHaveBeenCalledOnce();
    const play = vi.fn();
    f.audio.play(play);
    expect(play).not.toHaveBeenCalled();
    f.doc.hidden = false;
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.context.resume).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pageshow'));
    expect(f.context.state).toBe('running');
    expect(f.create).toHaveBeenCalledOnce();
  });

  it('enqueues recovery even if a quick return happens before suspension finishes', () => {
    const f = fixture();
    f.gesture();
    f.context.suspend.mockResolvedValue(undefined);
    f.doc.hidden = true;
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.context.state).toBe('running');
    f.doc.hidden = false;
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.context.resume).toHaveBeenCalledOnce();
  });

  it.each(['mute', 'hide', 'destroy'])('does not replay queued notes after %s', async (action) => {
    const f = fixture();
    f.gesture();
    f.context.state = 'suspended';
    const finish = deferredResume(f.context);
    const play = vi.fn();
    f.audio.play(play);
    if (action === 'mute') {
      f.mute(true);
      f.mute(false);
    } else if (action === 'hide') {
      f.doc.hidden = true;
      f.doc.dispatchEvent(new Event('visibilitychange'));
      f.doc.hidden = false;
    } else f.audio.destroy();
    await finish();
    expect(play).not.toHaveBeenCalled();
    f.audio.destroy();
    expect(f.context.close).toHaveBeenCalledOnce();
    f.gesture();
    window.dispatchEvent(new Event('keydown'));
    expect(f.create).toHaveBeenCalledOnce();
  });

  it('keeps saved mute in effect and resumes after unmuting', () => {
    const f = fixture();
    f.mute(true);
    f.gesture();
    f.audio.retry();
    expect(f.create).not.toHaveBeenCalled();
    f.mute(false);
    expect(f.create).not.toHaveBeenCalled();
    f.gesture();
    f.mute(true);
    f.mute(false);
    expect(f.context.resume).toHaveBeenCalledOnce();
  });

  it('recreates a closed or failed context on the next gesture', async () => {
    const f = fixture();
    f.gesture();
    f.context.state = 'closed';
    f.gesture();
    expect(f.create).toHaveBeenCalledTimes(2);
    f.context.state = 'interrupted';
    f.context.resume.mockRejectedValue(new Error('Audio device unavailable'));
    f.gesture();
    await vi.waitFor(() => expect(f.context.resume).toHaveBeenCalledOnce());
    await Promise.resolve();
    f.gesture();
    expect(f.create).toHaveBeenCalledTimes(3);
  });

  it('drops stale notes and bounds waiting notes during a blocked resume', async () => {
    const f = fixture();
    f.gesture();
    f.context.state = 'suspended';
    const finish = deferredResume(f.context);
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const stale = vi.fn();
    f.audio.play(stale);
    now.mockReturnValue(300);
    const recent = vi.fn();
    for (let i = 0; i < 30; i++) f.audio.play(recent);
    await finish();
    expect(stale).not.toHaveBeenCalled();
    expect(recent).toHaveBeenCalledTimes(24);
  });

  it('expires an isolated old first tap rather than playing it much later', async () => {
    const f = fixture();
    f.gesture();
    f.context.state = 'suspended';
    const finish = deferredResume(f.context);
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const play = vi.fn();
    f.audio.play(play);
    now.mockReturnValue(300);
    await finish();
    expect(play).not.toHaveBeenCalled();
  });

  it('rebuilds on a Fix sound click during the gesture without a second rebuild in update', () => {
    const f = fixture();
    f.gesture();
    const old = f.context;
    const event = new Event('click');
    Object.defineProperty(event, 'target', {
      value: { closest: () => ({}) },
    });
    f.root.dispatchEvent(event);
    f.audio.retry();
    expect(old.close).toHaveBeenCalledOnce();
    expect(f.create).toHaveBeenCalledTimes(2);
    const play = vi.fn();
    f.audio.play(play);
    expect(play).toHaveBeenCalledExactlyOnceWith(f.context);
  });

  it('handles unavailable audio and initialization failures without breaking the game', () => {
    const f = fixture();
    f.create.mockImplementationOnce(() => {
      throw new Error('No audio device');
    });
    expect(() => f.gesture()).not.toThrow();
    f.initialize.mockImplementationOnce(() => {
      throw new Error('Graph setup failed');
    });
    f.gesture();
    expect(f.context.close).toHaveBeenCalledOnce();
    f.gesture();
    expect(f.context.state).toBe('running');
  });
});

describe('instrument and effect integration', () => {
  it('limits rapid piano notes without repeatedly stopping the same oldest note', () => {
    const f = fixture();
    const piano = new PianoAudio(f.root as HTMLElement, f.mutedValue);
    cleanup.push(() => piano.destroy());
    f.gesture();
    for (let i = 0; i < 18; i++) piano.play(60);
    expect(f.context.oscillators[0]!.stop).toHaveBeenCalledTimes(2);
    expect(f.context.oscillators[1]!.stop).toHaveBeenCalledTimes(2);
    expect(f.context.oscillators[2]!.stop).toHaveBeenCalledOnce();
  });

  it('plays the piano on the first touch and stops old notes before resuming', () => {
    const f = fixture();
    const piano = new PianoAudio(f.root as HTMLElement, f.mutedValue);
    cleanup.push(() => piano.destroy());
    f.gesture();
    const context = f.context;
    piano.play(60);
    expect(context.oscillators).toHaveLength(1);
    f.mute(true);
    expect(context.oscillators[0]!.stop).toHaveBeenCalledTimes(2);
    f.mute(false);
    piano.play(64);
    expect(context.oscillators).toHaveLength(2);
    expect(context.oscillators[0]!.start).toHaveBeenCalledOnce();
  });

  it('rebuilds the drum graph and plays through the new context after closure', () => {
    const f = fixture();
    const drums = new DrumAudio(f.root as HTMLElement, f.mutedValue);
    cleanup.push(() => drums.destroy());
    f.gesture();
    const old = f.context;
    drums.play(DRUMS.find((drum) => drum.voice === 'kick')!);
    expect(old.oscillators).toHaveLength(1);
    old.state = 'closed';
    f.gesture();
    drums.play(DRUMS.find((drum) => drum.voice === 'kick')!);
    expect(f.context).not.toBe(old);
    expect(f.context.oscillators).toHaveLength(1);
    expect(old.oscillators[0]!.stop).toHaveBeenCalledTimes(2);
  });

  it('reuses the feedback context across many sounds and respects mute', () => {
    const f = fixture();
    cleanup.push(initializeFeedbackAudio(f.root, f.mutedValue));
    f.gesture();
    const context = f.context;
    const created = f.create.mock.calls.length;
    for (let i = 0; i < 5; i++) playPlacementTone(false);
    expect(f.create).toHaveBeenCalledTimes(created);
    expect(context.oscillators).toHaveLength(5);
    expect(context.close).not.toHaveBeenCalled();
    f.mute(true);
    playPlacementTone(true);
    expect(context.oscillators).toHaveLength(5);
    for (const source of context.oscillators) expect(source.stop).toHaveBeenCalledTimes(2);
  });
});
