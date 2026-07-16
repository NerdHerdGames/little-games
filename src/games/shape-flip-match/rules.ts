import { SHAPE_FISH, type FishColor, type FishShape } from '../fish-shape-match/rules';

export interface ShapeMatchCard {
  id: string;
  itemId: string;
  shape: FishShape;
  color: FishColor;
}

export interface ShapeFlipMatchState {
  deck: readonly ShapeMatchCard[];
  revealed: readonly string[];
  matched: readonly string[];
  pairs: number;
  complete: boolean;
}

export interface CardFlipResult {
  accepted: boolean;
  matchedPair: boolean;
  needsConceal: boolean;
  spokenText: string;
  state: ShapeFlipMatchState;
}

const shuffle = (cards: ShapeMatchCard[], random: () => number): ShapeMatchCard[] => {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(Math.max(0, random()) * (index + 1)));
    const card = cards[index];
    const swap = cards[swapIndex];
    if (card && swap) [cards[index], cards[swapIndex]] = [swap, card];
  }
  return cards;
};

const itemName = (card: ShapeMatchCard): string => `${card.color} ${card.shape}`;
const pluralShape = (shape: FishShape): string => `${shape}s`;

export const createShapeFlipMatch = (random: () => number = Math.random): ShapeFlipMatchState => {
  const deck = SHAPE_FISH.flatMap((item) =>
    (['a', 'b'] as const).map((copy) => ({
      id: `${item.id}-${copy}`,
      itemId: item.id,
      shape: item.shape,
      color: item.color,
    })),
  );
  return { deck: shuffle(deck, random), revealed: [], matched: [], pairs: 0, complete: false };
};

export const flipShapeCard = (state: ShapeFlipMatchState, cardId: string): CardFlipResult => {
  const card = state.deck.find(({ id }) => id === cardId);
  const unavailable =
    !card ||
    state.complete ||
    state.revealed.length >= 2 ||
    state.revealed.includes(cardId) ||
    state.matched.includes(cardId);
  if (unavailable)
    return { accepted: false, matchedPair: false, needsConceal: false, spokenText: '', state };

  if (state.revealed.length === 0) {
    return {
      accepted: true,
      matchedPair: false,
      needsConceal: false,
      spokenText: itemName(card),
      state: { ...state, revealed: [cardId] },
    };
  }

  const first = state.deck.find(({ id }) => id === state.revealed[0]);
  if (!first) throw new Error('The first revealed shape card was not found in the deck.');
  if (first.itemId !== card.itemId) {
    return {
      accepted: true,
      matchedPair: false,
      needsConceal: true,
      spokenText: itemName(card),
      state: { ...state, revealed: [...state.revealed, cardId] },
    };
  }

  const matched = [...state.matched, first.id, card.id];
  const pairs = state.pairs + 1;
  return {
    accepted: true,
    matchedPair: true,
    needsConceal: false,
    spokenText: `You matched 2 ${card.color} ${pluralShape(card.shape)}`,
    state: { ...state, revealed: [], matched, pairs, complete: pairs === SHAPE_FISH.length },
  };
};

export const concealShapeCards = (state: ShapeFlipMatchState): ShapeFlipMatchState => ({
  ...state,
  revealed: [],
});
