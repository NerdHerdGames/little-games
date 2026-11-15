import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionState } from './ActionState';
import { ConstructionGestureAdapter } from './ConstructionGestureAdapter';

function fixture() {
  const captures = new Set<number>();
  const element = Object.assign(new EventTarget(), {
    clientWidth: 500,
    clientHeight: 400,
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 500, height: 400 }),
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
  });
  const state = new ActionState();
  const adapter = new ConstructionGestureAdapter(element as unknown as HTMLElement, state);
  const event = (type: string, x: number, y: number, id = 1): void => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { clientX: x, clientY: y, pointerId: id, button: 0 });
    element.dispatchEvent(event);
  };
  return { state, adapter, event, captures };
}
beforeEach(() => {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

describe('logical construction input', () => {
  it('queues complete gestures in order and discards nonfinite coordinates', () => {
    const state = new ActionState();
    state.requestBuildPointer({ phase: 'start', x: 0, y: 0 });
    state.requestBuildPointer({ phase: 'move', x: 0.5, y: -0.2 });
    state.requestBuildPointer({ phase: 'cancel', x: 0, y: 0 });
    state.requestBuildPointer({ phase: 'end', x: NaN, y: 0 });
    expect(state.consumeBuildPointers().map((a) => a.phase)).toEqual(['start', 'move', 'cancel']);
    expect(state.consumeBuildPointers()).toEqual([]);
    state.requestBuildPointer({ phase: 'start', x: 0, y: 0 });
    state.clearBuildPointers();
    expect(state.consumeBuildPointers()).toEqual([]);
  });
  it('normalizes a single-finger selection and drag without turning the camera', () => {
    const f = fixture();
    f.event('pointerdown', 350, 250);
    f.event('pointermove', 475, 150);
    f.event('pointerup', 475, 150);
    expect(f.state.consumeBuildPointers()).toEqual([
      { phase: 'start', x: 0, y: 0 },
      { phase: 'move', x: 0.5, y: 0.5 },
      { phase: 'end', x: 0.5, y: 0.5 },
    ]);
    expect(f.state.consumeViewGesture()).toBeUndefined();
    f.adapter.destroy();
    expect(f.captures.size).toBe(0);
  });
  it('cancels an edit when a second finger arrives, pinches, and never commits on release', () => {
    const f = fixture();
    f.event('pointerdown', 200, 200);
    f.event('pointerdown', 400, 200, 2);
    f.event('pointermove', 450, 230, 2);
    f.event('pointerup', 450, 230, 2);
    f.event('pointerup', 200, 200);
    expect(f.state.consumeBuildPointers().map((a) => a.phase)).toEqual(['start', 'cancel']);
    expect(f.state.consumeViewGesture()!.zoom).toBeGreaterThan(0);
    f.adapter.destroy();
  });
  it('cleans up captured pointers and listeners on scene shutdown', () => {
    const f = fixture();
    f.event('pointerdown', 200, 200);
    f.adapter.destroy();
    f.event('pointerdown', 300, 250);
    expect(f.state.consumeBuildPointers()).toEqual([]);
    expect(f.captures.size).toBe(0);
  });
});
