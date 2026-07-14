import { createPlacementPuzzle } from '../puzzle/rules';

export const PLUTO_PIECES = [
  { id: 'north-west', targetId: 'heart-north-west' },
  { id: 'north-east', targetId: 'heart-north-east' },
  { id: 'middle', targetId: 'heart-middle' },
  { id: 'south-west', targetId: 'heart-south-west' },
  { id: 'south-east', targetId: 'heart-south-east' },
] as const;

export const createPlutoPuzzle = () => createPlacementPuzzle(PLUTO_PIECES);
