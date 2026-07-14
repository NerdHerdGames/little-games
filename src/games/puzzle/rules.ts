export interface PuzzlePieceDefinition {
  id: string;
  targetId: string;
}
export interface PlacementPuzzleState {
  pieces: readonly PuzzlePieceDefinition[];
  placedIds: ReadonlySet<string>;
  complete: boolean;
}
export interface PlacementResult {
  state: PlacementPuzzleState;
  correct: boolean;
  newlyPlaced: boolean;
}

export const createPlacementPuzzle = (
  pieces: readonly PuzzlePieceDefinition[],
): PlacementPuzzleState => {
  if (pieces.length === 0) throw new Error('A placement puzzle requires at least one piece.');
  const ids = new Set(pieces.map((piece) => piece.id));
  const targets = new Set(pieces.map((piece) => piece.targetId));
  if (ids.size !== pieces.length || targets.size !== pieces.length)
    throw new Error('Puzzle piece and target ids must be unique.');
  return { pieces, placedIds: new Set(), complete: false };
};

export const placePuzzlePiece = (
  state: PlacementPuzzleState,
  pieceId: string,
  targetId: string,
): PlacementResult => {
  const piece = state.pieces.find((candidate) => candidate.id === pieceId);
  if (!piece) throw new Error(`Unknown puzzle piece: ${pieceId}.`);
  if (state.placedIds.has(pieceId)) return { state, correct: true, newlyPlaced: false };
  if (piece.targetId !== targetId) return { state, correct: false, newlyPlaced: false };
  const placedIds = new Set(state.placedIds).add(pieceId);
  return {
    state: { ...state, placedIds, complete: placedIds.size === state.pieces.length },
    correct: true,
    newlyPlaced: true,
  };
};
