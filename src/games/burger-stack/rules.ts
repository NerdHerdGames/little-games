export const INGREDIENTS = {
  'bottom-bun': 'Bottom bun',
  patty: 'Patty',
  cheese: 'Cheese',
  lettuce: 'Lettuce',
  tomato: 'Tomato',
  pickle: 'Pickles',
  onion: 'Onion',
  'top-bun': 'Top bun',
} as const;

export type Ingredient = keyof typeof INGREDIENTS;
type Filling = Exclude<Ingredient, 'bottom-bun' | 'top-bun'>;

export interface BurgerOrder {
  name: string;
  layers: readonly Ingredient[];
}

const order = (name: string, ...fillings: Filling[]): BurgerOrder => ({
  name,
  layers: ['bottom-bun', ...fillings, 'top-bun'],
});

// Every card is stored in the order the pieces go onto the plate.
export const BURGER_ORDERS: readonly BurgerOrder[] = [
  order('Little Burger', 'patty'),
  order('Cheeseburger', 'patty', 'cheese'),
  order('Garden Burger', 'lettuce', 'tomato'),
  order('Pickle Burger', 'patty', 'pickle', 'cheese'),
  order('Double Patty', 'patty', 'cheese', 'patty'),
  order('Crunchy Burger', 'lettuce', 'patty', 'onion', 'pickle'),
  order('Tomato Melt', 'patty', 'tomato', 'cheese', 'tomato'),
  order('Garden Deluxe', 'lettuce', 'onion', 'tomato', 'pickle', 'cheese'),
  order('Big Stack', 'patty', 'cheese', 'patty', 'lettuce', 'tomato'),
  order('Everything Burger', 'lettuce', 'patty', 'cheese', 'onion', 'pickle', 'tomato'),
];

export const isIngredient = (id: string): id is Ingredient => Object.hasOwn(INGREDIENTS, id);

export interface Kitchen {
  orderIndex: number;
  stack: readonly Ingredient[];
  served: boolean;
}

export const createKitchen = (): Kitchen => ({ orderIndex: 0, stack: [], served: false });

export const currentOrder = (kitchen: Kitchen): BurgerOrder => BURGER_ORDERS[kitchen.orderIndex]!;

export const nextLayer = (kitchen: Kitchen): Ingredient | undefined =>
  currentOrder(kitchen).layers[kitchen.stack.length];

export const placeLayer = (kitchen: Kitchen, ingredient: Ingredient): Kitchen =>
  nextLayer(kitchen) === ingredient
    ? { ...kitchen, stack: [...kitchen.stack, ingredient] }
    : kitchen;

export const undoLayer = (kitchen: Kitchen): Kitchen =>
  !kitchen.served && kitchen.stack.length
    ? { ...kitchen, stack: kitchen.stack.slice(0, -1) }
    : kitchen;

export const serveOrder = (kitchen: Kitchen): Kitchen =>
  !kitchen.served && nextLayer(kitchen) === undefined ? { ...kitchen, served: true } : kitchen;

export const takeNextOrder = (kitchen: Kitchen): Kitchen =>
  kitchen.served
    ? { ...createKitchen(), orderIndex: (kitchen.orderIndex + 1) % BURGER_ORDERS.length }
    : kitchen;
