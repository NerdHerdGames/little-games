import { describe, expect, it } from 'vitest';
import { ActionState } from './ActionState';

describe('ActionState', () => {
  it('accumulates logical view gestures, consumes them once, and clears them on navigation', () => {
    const input = new ActionState();
    expect(input.consumeViewGesture()).toBeUndefined();
    input.addViewGesture(0.2, 0.3, 0.1);
    input.addViewGesture(0.1, -0.1, 0.2);
    const gesture = input.consumeViewGesture();
    expect(gesture?.rotateX).toBeCloseTo(0.3);
    expect(gesture?.rotateY).toBeCloseTo(0.2);
    expect(gesture?.zoom).toBeCloseTo(0.3);
    expect(input.consumeViewGesture()).toBeUndefined();
    input.addViewGesture(1, 1, 1);
    input.clearViewGestures();
    input.addViewGesture(Infinity, 0, 0);
    expect(input.consumeViewGesture()).toBeUndefined();
  });
  it('delivers menu activations once in order and clears them on navigation', () => {
    const input = new ActionState();
    input.requestActivation('nose:next');
    input.requestActivation('launch');
    input.update();
    expect(input.consumeActivation()).toBe('nose:next');
    expect(input.consumeActivation()).toBe('launch');
    expect(input.consumeActivation()).toBeUndefined();
    input.requestActivation('pause');
    input.clearActivations();
    expect(input.consumeActivation()).toBeUndefined();
  });
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
