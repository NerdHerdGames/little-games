import { describe, expect, it, vi } from 'vitest';
import {
  advanceSearchActivity,
  isSearchHintEligible,
  selectSearchTarget,
  VisualSearchSession,
} from '../search/rules';
import { createMakemakeSearch, MAKEMAKE_HINT_DELAY_MS, MAKEMAKE_OBJECTIVES } from './rules';

describe('Makemake Moon Search rules', () => {
  it('enforces Makemake-before-moon objective order', () => {
    const earlyMoon = selectSearchTarget(createMakemakeSearch(), 'moon');
    expect(earlyMoon.correct).toBe(false);
    expect(earlyMoon.state.objectiveIndex).toBe(0);
  });
  it('leaves progress unchanged after selecting an incorrect object', () => {
    const state = createMakemakeSearch();
    const result = selectSearchTarget(state, 'distant-star');
    expect(result.correct).toBe(false);
    expect(result.state).toBe(state);
  });
  it('finds Makemake and advances to the moon objective', () => {
    const result = selectSearchTarget(createMakemakeSearch(), 'makemake');
    expect(result.correct).toBe(true);
    expect(result.state.objectiveIndex).toBe(1);
    expect(result.state.complete).toBe(false);
  });
  it('finds the moon and completes the ordered search', () => {
    const afterMakemake = selectSearchTarget(createMakemakeSearch(), 'makemake').state;
    const result = selectSearchTarget(afterMakemake, 'moon');
    expect(result.correct).toBe(true);
    expect(result.completedNow).toBe(true);
    expect(result.state.complete).toBe(true);
  });
  it('makes a hint eligible only after enough activity', () => {
    const early = advanceSearchActivity(createMakemakeSearch(), MAKEMAKE_HINT_DELAY_MS - 1);
    const ready = advanceSearchActivity(early, 1);
    expect(isSearchHintEligible(early)).toBe(false);
    expect(isSearchHintEligible(ready)).toBe(true);
  });
  it('calls the reusable completion callback once when objectives finish', () => {
    const complete = vi.fn();
    const session = new VisualSearchSession(MAKEMAKE_OBJECTIVES, MAKEMAKE_HINT_DELAY_MS, complete);
    session.select('makemake');
    session.select('moon');
    session.select('moon');
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
