import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionState } from './ActionState';
import { MapPlacementAdapter } from './MapPlacementAdapter';

// Minimal event surfaces exercise the device-to-action boundary without a browser dependency.
function fixture() {
  const captured = new Set<number>();
  const ghost = {
    style: {},
    removeAttribute: vi.fn(),
    setAttribute: vi.fn(),
    classList: { add: vi.fn() },
    remove: vi.fn(),
  };
  const piece = {
    dataset: { piece: '48' },
    style: {},
    clientWidth: 240,
    setPointerCapture: (id: number) => captured.add(id),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: (id: number) => captured.delete(id),
    cloneNode: () => ghost,
  };
  let pieceTarget = true;
  const map = {
    dataset: { currentPiece: '48' },
    getBoundingClientRect: () => ({ left: 100, top: 100, right: 600, bottom: 600 }),
    getScreenCTM: () => ({ a: 2, inverse: () => ({ a: 0.5, d: 0.5, e: -50, f: -50 }) }),
    contains: () => !pieceTarget,
  };
  const root = Object.assign(new EventTarget(), {
    closest: () => (pieceTarget ? piece : null),
    querySelector: () => map,
    append: vi.fn(),
  });
  const input = new ActionState();
  const adapter = new MapPlacementAdapter(root as unknown as HTMLElement, input);
  const event = (type: string, x = 300, y = 400, pointerId = 1) => {
    const value = new Event(type, { cancelable: true });
    Object.assign(value, { button: 0, clientX: x, clientY: y, pointerId });
    return root.dispatchEvent(value);
  };
  return {
    input,
    adapter,
    root,
    event,
    ghost,
    captured,
    targetMap: () => {
      pieceTarget = false;
    },
  };
}

describe('MapPlacementAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('document', new EventTarget());
    vi.stubGlobal(
      'DOMPoint',
      class {
        constructor(
          readonly x: number,
          readonly y: number,
        ) {}
        matrixTransform(matrix: { a: number; d: number; e: number; f: number }) {
          return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f };
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('converts a captured drag to one logical placement in map coordinates', () => {
    const f = fixture();
    f.event('pointerdown', 30, 40);
    f.event('pointermove');
    expect(f.root.append).toHaveBeenCalled();
    f.event('pointerup');
    expect(f.input.consumePlacement()).toEqual({ pieceId: '48', x: 100, y: 150, tolerance: 24 });
    expect(f.input.consumePlacement()).toBeUndefined();
    expect(f.captured.size).toBe(0);
    expect(f.ghost.remove).toHaveBeenCalledOnce();
    expect(f.event('click')).toBe(false);
    f.adapter.destroy();
  });

  it('supports tapping a map slot without dragging', () => {
    const f = fixture();
    f.targetMap();
    f.event('pointerup');
    expect(f.input.consumePlacement()?.pieceId).toBe('48');
    f.adapter.destroy();
  });

  it('ignores toolbox taps but reports outside drops so they count toward help', () => {
    const f = fixture();
    f.event('pointerdown', 30, 40);
    f.event('pointerup', 30, 40);
    expect(f.input.consumePlacement()).toBeUndefined();
    f.event('pointerdown', 30, 40);
    f.event('pointermove', 60, 70);
    f.event('pointerup', 60, 70);
    expect(f.input.consumePlacement()).toEqual({ pieceId: '48', x: -20, y: -15, tolerance: 24 });
    f.adapter.destroy();
  });

  it('cancels active drags and detaches listeners on shutdown', () => {
    const f = fixture();
    f.event('pointerdown', 30, 40);
    f.event('pointermove');
    f.event('pointercancel');
    f.event('pointerup');
    expect(f.input.consumePlacement()).toBeUndefined();
    f.adapter.destroy();
    f.targetMap();
    f.event('pointerup');
    expect(f.input.consumePlacement()).toBeUndefined();
  });
});
