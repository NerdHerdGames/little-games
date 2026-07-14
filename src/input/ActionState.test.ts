import { describe, expect, it } from 'vitest';
import { ActionState } from './ActionState';

describe('ActionState', () => {
  it('distinguishes pressed, held, and released actions', () => {
    const input = new ActionState();
    input.setSource('touch', { moveRight: true });
    input.update();
    expect(input.get('moveRight')).toEqual({ held: true, pressed: true, released: false });
    input.update();
    expect(input.get('moveRight')).toEqual({ held: true, pressed: false, released: false });
    input.setSource('touch', {});
    input.update();
    expect(input.get('moveRight')).toEqual({ held: false, pressed: false, released: true });
  });

  it('combines devices and tracks the most recently pressed method', () => {
    const input = new ActionState();
    input.setSource('keyboard', { moveLeft: true });
    input.update();
    expect(input.lastInputMethod).toBe('keyboard');
    input.setSource('touch', { primaryAction: true });
    input.update();
    expect(input.isHeld('moveLeft')).toBe(true);
    expect(input.lastInputMethod).toBe('touch');
  });

  it('clears a disconnected source', () => {
    const input = new ActionState();
    input.setSource('gamepad', { confirm: true });
    input.update();
    input.removeSource('gamepad');
    input.update();
    expect(input.get('confirm').released).toBe(true);
  });
});
