import { describe, expect, it } from 'vitest';
import { ActionState } from './ActionState';

describe('logical paint input', () => {
  it('queues segments in order and consumes each exactly once', () => {
    const state = new ActionState();
    const first = { from: { x: 1, y: 2 }, to: { x: 3, y: 4 } };
    const second = { from: first.to, to: { x: 5, y: 6 } };
    state.requestPaint(first);
    state.requestPaint(second);
    expect(state.consumePaint()).toEqual([first, second]);
    expect(state.consumePaint()).toEqual([]);
  });
  it('rejects invalid segments and clears input when a view closes', () => {
    const state = new ActionState();
    state.requestPaint({ from: { x: Infinity, y: 2 }, to: { x: 3, y: 4 } });
    expect(state.consumePaint()).toEqual([]);
    state.requestPaint({ from: { x: 1, y: 2 }, to: { x: 3, y: 4 } });
    state.clearPaint();
    expect(state.consumePaint()).toEqual([]);
  });
});
