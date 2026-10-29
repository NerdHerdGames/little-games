import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionState } from './ActionState';
import { StrikePadAdapter } from './StrikePadAdapter';

function fixture() {
  const pad = { dataset: { action: 'pad:kick' }, disabled: false, focus: vi.fn() };
  const root = Object.assign(new EventTarget(), {
    closest: () => pad,
    contains: () => true,
    querySelector: () => pad,
  });
  const state = new ActionState();
  const adapter = new StrikePadAdapter(root as unknown as HTMLElement, state);
  const pointer = (button = 0) => {
    const event = new Event('pointerdown', { cancelable: true });
    Object.assign(event, { button });
    root.dispatchEvent(event);
  };
  const key = (options: Record<string, unknown> = {}) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { code: 'Digit7', ...options });
    window.dispatchEvent(event);
  };
  return { root, pad, state, adapter, pointer, key };
}

describe('StrikePadAdapter', () => {
  beforeEach(() => vi.stubGlobal('window', new EventTarget()));
  afterEach(() => vi.unstubAllGlobals());

  it('queues every simultaneous or repeated strike immediately, without waiting for release', () => {
    const f = fixture();
    f.pointer();
    f.pointer();
    expect(f.state.consumeActivation()).toBe('pad:kick');
    expect(f.state.consumeActivation()).toBe('pad:kick');
    expect(f.state.consumeActivation()).toBeUndefined();
    expect(f.pad.focus).toHaveBeenCalledWith({ preventScroll: true });
    f.adapter.destroy();
  });

  it('suppresses pointer clicks after the strike but preserves native accessible clicks', () => {
    const f = fixture();
    const click = (detail: number) => {
      const event = new Event('click', { cancelable: true });
      Object.assign(event, { detail });
      f.root.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(click(1)).toBe(true);
    expect(click(0)).toBe(false);
    f.adapter.destroy();
  });

  it('ignores non-primary buttons, disabled pads, shortcuts with modifiers, and held keys', () => {
    const f = fixture();
    f.pointer(2);
    f.key({ repeat: true });
    f.key({ ctrlKey: true });
    f.key({ altKey: true });
    f.key({ metaKey: true });
    f.key({ code: 'KeyA' });
    f.pad.disabled = true;
    f.pointer();
    f.key();
    expect(f.state.consumeActivation()).toBeUndefined();
    f.pad.disabled = false;
    f.key();
    f.key({ code: 'Numpad7' });
    expect(f.state.consumeActivation()).toBe('pad:kick');
    expect(f.state.consumeActivation()).toBe('pad:kick');
    f.adapter.destroy();
    f.key();
    f.pointer();
    expect(f.state.consumeActivation()).toBeUndefined();
  });
});
