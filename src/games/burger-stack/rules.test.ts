import { describe, expect, it } from 'vitest';
import {
  BURGER_ORDERS,
  createKitchen,
  currentOrder,
  nextLayer,
  placeLayer,
  serveOrder,
  takeNextOrder,
  undoLayer,
} from './rules';

describe('Burger Stack orders', () => {
  it('leaves the stack intact when a piece skips the requested layer', () => {
    const kitchen = createKitchen();
    expect(placeLayer(kitchen, 'patty')).toBe(kitchen);
    const withBun = placeLayer(kitchen, 'bottom-bun');
    expect(placeLayer(withBun, 'top-bun')).toBe(withBun);
    expect(nextLayer(withBun)).toBe('patty');
  });

  it('can undo a layer before serving and keeps a served stack on the plate', () => {
    const kitchen = createKitchen();
    expect(undoLayer(kitchen)).toBe(kitchen);
    expect(serveOrder(kitchen)).toBe(kitchen);
    expect(takeNextOrder(kitchen)).toBe(kitchen);

    const ready = currentOrder(kitchen).layers.reduce(placeLayer, kitchen);
    const undone = undoLayer(ready);
    expect(nextLayer(undone)).toBe('top-bun');
    expect(serveOrder(undone)).toBe(undone);
    const served = serveOrder(placeLayer(undone, 'top-bun'));
    expect(served.served).toBe(true);
    expect(undoLayer(served)).toBe(served);
    expect(placeLayer(served, 'patty')).toBe(served);
  });

  it('serves every card, including repeated layers, and loops back to a fresh first order', () => {
    let kitchen = createKitchen();
    for (const order of BURGER_ORDERS) {
      expect(currentOrder(kitchen)).toBe(order);
      expect(kitchen.stack).toEqual([]);
      expect(order.layers[0]).toBe('bottom-bun');
      expect(order.layers.at(-1)).toBe('top-bun');
      for (const ingredient of order.layers) {
        expect(nextLayer(kitchen)).toBe(ingredient);
        kitchen = placeLayer(kitchen, ingredient);
      }
      expect(kitchen.stack).toEqual(order.layers);
      expect(nextLayer(kitchen)).toBeUndefined();
      kitchen = serveOrder(kitchen);
      expect(kitchen.served).toBe(true);
      kitchen = takeNextOrder(kitchen);
    }
    expect(kitchen).toEqual(createKitchen());
  });
});
