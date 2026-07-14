import { createVisualSearch } from '../search/rules';

export const MAKEMAKE_OBJECTIVES = [
  { id: 'makemake', label: 'Makemake' },
  { id: 'moon', label: "Makemake's moon" },
] as const;
export const MAKEMAKE_HINT_DELAY_MS = 12_000;
export const createMakemakeSearch = () =>
  createVisualSearch(MAKEMAKE_OBJECTIVES, MAKEMAKE_HINT_DELAY_MS);
