import { describe, expect, it } from 'vitest';
import {
  currentOrder,
  nextOrder,
  ORDERS,
  serveOrder,
  stackIngredient,
  startOrder,
  undoIngredient,
  type BurgerGame,
} from './rules';

const buildOrder = (game: BurgerGame): BurgerGame =>
  currentOrder(game).layers.reduce(stackIngredient, game);

describe('burger orders', () => {
  it('serves every card in sequence, including repeated ingredients, and can start again', () => {
    let game = startOrder();
    for (const [index, order] of ORDERS.entries()) {
      expect(game.order).toBe(index);
      expect(game.stack).toEqual([]);
      expect(currentOrder(game)).toBe(order);
      expect(order.layers[0]).toBe('bottom-bun');
      expect(order.layers.at(-1)).toBe('top-bun');
      const built = buildOrder(game);
      const result = serveOrder(built);
      expect(result).toEqual({ kind: 'served', game: { ...built, served: true } });
      if (result.kind === 'served') game = nextOrder(result.game);
    }
    expect(game).toEqual(startOrder());
  });

  it('counts pieces still needed and keeps the current card until served', () => {
    const game = stackIngredient(startOrder(), 'bottom-bun');
    expect(serveOrder(game)).toEqual({ kind: 'missing', count: 3 });
    expect(nextOrder(game)).toBe(game);
  });

  it('reports the first layer out of order and allows retries after undo', () => {
    const first = stackIngredient(startOrder(), 'bottom-bun');
    const wrong = (['cheese', 'patty', 'top-bun'] as const).reduce(stackIngredient, first);
    expect(serveOrder(wrong)).toEqual({ kind: 'mismatch', layer: 2, ingredient: 'patty' });
    expect(stackIngredient(wrong, 'lettuce')).toBe(wrong);
    const undone = undoIngredient(undoIngredient(undoIngredient(wrong)));
    expect(undone).toEqual(first);
    const fixed = (['patty', 'cheese', 'top-bun'] as const).reduce(stackIngredient, undone);
    const result = serveOrder(fixed);
    expect(result.kind).toBe('served');
    if (result.kind !== 'served') throw new Error('Expected the corrected order to be served.');
    expect(undoIngredient(result.game)).toBe(result.game);
    expect(stackIngredient(result.game, 'tomato')).toBe(result.game);
  });
});
