import { Quaternion, Vector3 } from 'three';
import { emptyConstruction } from './ConstructionController3D';
import { alignPiece, createPiece } from './ConnectionSystem3D';
import { definition } from './TrackPieceRegistry';
import type { Construction, TrackPiece } from './types';

export const EXAMPLES = [
  'Rainbow ride',
  'Music mountain',
  'Twin-track race',
  'Spiral playground',
  'Sorting station',
  'Chain reaction',
] as const;
export function example(index = 0): Construction {
  const state = emptyConstruction();
  function route(types: string[], start: [number, number, number], yaw = 0): void {
    let previous: TrackPiece | undefined;
    for (const type of types) {
      let piece = createPiece(type, start);
      piece.rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw).toArray();
      if (previous) {
        const out = definition(previous.type).connectors.find((p) => p.flow === 'out')!;
        const input = definition(type).connectors.find((p) => p.flow === 'in')!;
        piece = alignPiece(piece, input, previous, out);
        state.connections.push({ a: previous.id, portA: out.id, b: piece.id, portB: input.id });
      }
      state.pieces.push(piece);
      if (!['drop', 'elbow', 'loop'].includes(type)) {
        const support = createPiece('column', [piece.position[0], 0, piece.position[2]]);
        support.scale = Math.max(0.1, (piece.position[1] - 0.2) / 2);
        state.pieces.push(support);
      }
      previous = piece;
    }
  }
  if (index === 1) {
    state.gameMode = 'music';
    route(
      [
        'dispenser',
        'gentle',
        'bell',
        'turn90',
        'xylophone',
        'short',
        'drum',
        'turn90',
        'xylophone',
        'finish',
      ],
      [-5, 7, -6],
    );
    state.pieces
      .filter((p) => definition(p.type).behavior === 'bell')
      .forEach((p, i) => (p.settings.note = [60, 64, 67][i] ?? 72));
  } else if (index === 2) {
    state.gameMode = 'race';
    route(['dispenser', 'gentle', 'medium', 'turn90', 'medium', 'finish'], [-5, 6, -7]);
    route(['dispenser', 'gentle', 'medium', 'turn90', 'medium', 'finish'], [3, 6, -7]);
  } else if (index === 3) {
    route(['dispenser', 'helix', 'turn90', 'clear-tube', 'finish'], [-5, 8, -4]);
    // A spiral needs a central mast: supports under its entrance would cross
    // the lower lap. Keep the marble's entire descending path unobstructed.
    state.pieces = state.pieces.filter((p) => p.type !== 'column');
    const mast = createPiece('column', [-3, 0, -2.6]);
    mast.scale = 3.8;
    state.pieces.push(mast);
  } else if (index === 4) {
    state.gameMode = 'sorting';
    route(['dispenser', 'gentle', 'sorter'], [-3, 6, -5]);
    const sorter = state.pieces.find((p) => p.type === 'sorter')!;
    for (let i = 0; i < 2; i++) {
      const bin = alignPiece(
        createPiece('bin'),
        definition('bin').connectors[0]!,
        sorter,
        definition('sorter').connectors[i + 1]!,
      );
      bin.settings.color = i === 0 ? 'red' : 'blue';
      state.pieces.push(bin);
      state.connections.push({ a: sorter.id, portA: `out${i}`, b: bin.id, portB: 'in' });
    }
    state.marble.appearance = 'red';
  } else if (index === 5) {
    state.gameMode = 'chain';
    route(['dispenser', 'gentle', 'trigger', 'medium', 'gate', 'bell', 'finish'], [-5, 6, -7]);
    const trigger = state.pieces.find((p) => p.type === 'trigger')!;
    const gate = state.pieces.find((p) => p.type === 'gate')!;
    gate.settings.enabled = false;
    trigger.settings.link = gate.id;
  } else {
    route(
      [
        'dispenser',
        'gentle',
        'turn90',
        'clear-tube',
        'turn90',
        'medium',
        'bell',
        'turn90',
        'gentle',
        'finish',
      ],
      [-5, 7, -6],
    );
  }
  state.camera.target = [0, 3, 0];
  return state;
}
