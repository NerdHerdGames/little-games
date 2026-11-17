import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionState, type ConstructionAction } from './ActionState';
import { ConstructionAdapter } from './ConstructionAdapter';
class FakeInput extends EventTarget {
  type = 'text';
  value = '';
  checked = false;
  dataset: Record<string, string> = {};
}
function fixture() {
  const captured = new Set<number>();
  let palette = false;
  const root = Object.assign(new FakeInput(), {
    closest: () => (palette ? { dataset: { buildPiece: 'ramp' } } : null),
    setPointerCapture: (id: number) => {
      captured.add(id);
    },
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => {
      captured.delete(id);
    },
    getBoundingClientRect: () => ({ left: 100, top: 50 }),
    clientWidth: 500,
    clientHeight: 400,
  });
  const state = new ActionState();
  const adapter = new ConstructionAdapter(
    root as unknown as HTMLElement,
    root as unknown as HTMLCanvasElement,
    state,
  );
  const event = (type: string, x = 200, y = 200, id = 1, extra: Record<string, unknown> = {}) => {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, { button: 0, clientX: x, clientY: y, pointerId: id, ...extra });
    return root.dispatchEvent(e);
  };
  const drain = () => {
    const actions: ConstructionAction[] = [];
    let action = state.consumeConstruction();
    while (action) {
      actions.push(action);
      action = state.consumeConstruction();
    }
    return actions;
  };
  return {
    state,
    adapter,
    event,
    drain,
    captured,
    root,
    palette: () => {
      palette = true;
    },
  };
}
describe('ConstructionAdapter logical input boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('document', new EventTarget());
    vi.stubGlobal('HTMLInputElement', FakeInput);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('converts captured drags to canvas coordinates and prevents duplicate palette clicks', () => {
    const f = fixture();
    f.palette();
    f.event('pointerdown', 20, 100);
    f.event('pointermove', 300, 200);
    f.event('pointerup', 300, 200);
    expect(f.drain().map((a) => [a.phase, a.x, a.y, a.source])).toEqual([
      ['start', -80, 50, 'ramp'],
      ['move', 200, 150, 'ramp'],
      ['end', 200, 150, 'ramp'],
    ]);
    expect(f.captured.size).toBe(0);
    expect(f.event('click')).toBe(false);
    expect(f.state.consumeActivation()).toBeUndefined();
    f.adapter.destroy();
  });
  it('taps a palette item without committing an outside placement', () => {
    const f = fixture();
    f.palette();
    f.event('pointerdown', 20, 100);
    f.event('pointerup', 20, 100);
    expect(f.drain().at(-1)?.phase).toBe('cancel');
    expect(f.state.consumeActivation()).toBe('choose:ramp');
    f.adapter.destroy();
  });
  it('cancels a one-finger edit before pinch/pan and never commits after pinching', () => {
    const f = fixture();
    f.event('pointerdown', 200, 200, 1);
    f.event('pointerdown', 300, 200, 2);
    f.event('pointermove', 400, 200, 2);
    f.event('pointerup', 400, 200, 2);
    f.event('pointerup', 200, 200, 1);
    const events = f.drain();
    expect(events.map((a) => a.phase)).toEqual(['start', 'cancel', 'zoom', 'pan']);
    expect(events[2]!.dx).toBeCloseTo(Math.log(2));
    expect(f.captured.size).toBe(0);
    f.adapter.destroy();
  });
  it('releases contacts on interruption and removes listeners on teardown', () => {
    const f = fixture();
    f.event('pointerdown');
    window.dispatchEvent(new Event('blur'));
    expect(f.captured.size).toBe(0);
    expect(f.drain().at(-1)?.phase).toBe('cancel');
    f.adapter.destroy();
    f.event('pointerdown');
    expect(f.drain()).toEqual([]);
  });
  it('normalizes wheel input and emits one setting change per control edit', () => {
    const f = fixture();
    f.event('wheel', 200, 200, 1, { deltaY: 10, deltaMode: 1 });
    expect(f.drain()[0]!.dx).toBeCloseTo(-0.16);
    f.root.dataset.setting = 'size';
    f.root.type = 'range';
    f.root.value = '15';
    f.event('input');
    f.event('change');
    expect(f.state.consumeActivation()).toBe('value:size:15');
    expect(f.state.consumeActivation()).toBeUndefined();
    f.root.dataset.setting = 'color';
    f.root.type = 'select';
    f.root.value = '#ee6470';
    f.event('input');
    f.event('change');
    expect(f.state.consumeActivation()).toBe('value:color:%23ee6470');
    expect(f.state.consumeActivation()).toBeUndefined();
    f.adapter.destroy();
  });
});
