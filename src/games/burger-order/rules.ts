export const INGREDIENTS = {
  'bottom-bun': 'Bottom bun',
  patty: 'Patty',
  cheese: 'Cheese',
  tomato: 'Tomato',
  lettuce: 'Lettuce',
  pickles: 'Pickles',
  'top-bun': 'Top bun',
} as const;

export type Ingredient = keyof typeof INGREDIENTS;

interface Order {
  name: string;
  layers: readonly Ingredient[];
}

export const ORDERS = [
  { name: 'Classic Cheeseburger', layers: ['bottom-bun', 'patty', 'cheese', 'top-bun'] },
  { name: 'Garden Burger', layers: ['bottom-bun', 'patty', 'lettuce', 'tomato', 'top-bun'] },
  {
    name: 'Pickle Party',
    layers: ['bottom-bun', 'lettuce', 'patty', 'cheese', 'pickles', 'top-bun'],
  },
  {
    name: 'Tomato Deluxe',
    layers: ['bottom-bun', 'tomato', 'patty', 'cheese', 'lettuce', 'top-bun'],
  },
  {
    name: 'Double Stack',
    layers: ['bottom-bun', 'patty', 'cheese', 'patty', 'pickles', 'lettuce', 'top-bun'],
  },
  {
    name: 'The Works',
    layers: ['bottom-bun', 'lettuce', 'patty', 'cheese', 'tomato', 'pickles', 'top-bun'],
  },
] as const satisfies readonly [Order, ...Order[]];

export interface BurgerGame {
  order: number;
  stack: readonly Ingredient[];
  served: boolean;
}

type ServeResult =
  | { kind: 'served'; game: BurgerGame }
  | { kind: 'missing'; count: number }
  | { kind: 'mismatch'; layer: number; ingredient: Ingredient };

export const startOrder = (): BurgerGame => ({ order: 0, stack: [], served: false });

export const currentOrder = (game: BurgerGame): Order => ORDERS[game.order]!;

export function isIngredient(value: string): value is Ingredient {
  return Object.hasOwn(INGREDIENTS, value);
}

export function stackIngredient(game: BurgerGame, ingredient: Ingredient): BurgerGame {
  if (game.served || game.stack.length >= currentOrder(game).layers.length) return game;
  return { ...game, stack: [...game.stack, ingredient] };
}

export function undoIngredient(game: BurgerGame): BurgerGame {
  if (game.served || !game.stack.length) return game;
  return { ...game, stack: game.stack.slice(0, -1) };
}

export function serveOrder(game: BurgerGame): ServeResult {
  const recipe = currentOrder(game).layers;
  const count = recipe.length - game.stack.length;
  if (count > 0) return { kind: 'missing', count };
  const layer = recipe.findIndex((ingredient, index) => ingredient !== game.stack[index]);
  if (layer >= 0) return { kind: 'mismatch', layer: layer + 1, ingredient: recipe[layer]! };
  return { kind: 'served', game: { ...game, served: true } };
}

export function nextOrder(game: BurgerGame): BurgerGame {
  if (!game.served) return game;
  return { ...startOrder(), order: (game.order + 1) % ORDERS.length };
}
