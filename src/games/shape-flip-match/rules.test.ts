import { describe, expect, it } from 'vitest';
import { concealShapeCards, createShapeFlipMatch, flipShapeCard } from './rules';

describe('shape flip matching rules', () => {
  it('creates eighteen cards containing nine pairs', () => {
    const state = createShapeFlipMatch(() => 0.5);
    expect(state.deck).toHaveLength(18);
    expect(new Set(state.deck.map(({ itemId }) => itemId)).size).toBe(9);
  });
  it('reveals and speaks the first card', () => {
    const state = createShapeFlipMatch(() => 0);
    const card = state.deck[0];
    if (!card) throw new Error('Expected a card.');
    const result = flipShapeCard(state, card.id);
    expect(result.accepted).toBe(true);
    expect(result.spokenText).toBe(`${card.color} ${card.shape}`);
  });
  it('marks a matching pair and uses the requested announcement', () => {
    const state = createShapeFlipMatch(() => 0);
    const first = state.deck[0];
    const second = state.deck.find(({ itemId, id }) => itemId === first?.itemId && id !== first.id);
    if (!first || !second) throw new Error('Expected a matching pair.');
    const one = flipShapeCard(state, first.id).state;
    const result = flipShapeCard(one, second.id);
    expect(result.matchedPair).toBe(true);
    expect(result.spokenText).toContain('You matched 2');
    expect(result.state.pairs).toBe(1);
  });
  it('conceals mismatched cards without losing completed pairs', () => {
    const state = createShapeFlipMatch(() => 0);
    const first = state.deck[0];
    const second = state.deck.find(({ itemId }) => itemId !== first?.itemId);
    if (!first || !second) throw new Error('Expected two different cards.');
    const mismatch = flipShapeCard(flipShapeCard(state, first.id).state, second.id);
    expect(mismatch.needsConceal).toBe(true);
    expect(concealShapeCards(mismatch.state).revealed).toEqual([]);
  });
});
