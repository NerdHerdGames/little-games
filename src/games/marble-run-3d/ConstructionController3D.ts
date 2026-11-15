import { Euler, Quaternion } from 'three';
import { definition } from './TrackPieceRegistry';
import {
  createPiece,
  findSnap,
  MAX_PIECES,
  reconcileConnections,
  type SnapResult,
} from './ConnectionSystem3D';
import { DEFAULT_MARBLE, type Construction, type TrackPiece, type Vec3 } from './types';

export function emptyConstruction(): Construction {
  return {
    version: 1,
    pieces: [],
    connections: [],
    buildMode: 'snap',
    gameMode: 'creative',
    marble: { ...DEFAULT_MARBLE },
    physics: 'Normal',
    camera: { yaw: -0.7, pitch: 0.7, distance: 23, target: [0, 3, 0] },
  };
}
export class ConstructionController3D {
  state = emptyConstruction();
  selected: string | undefined;
  preview: TrackPiece | undefined;
  snap: SnapResult | undefined;
  grid = false;
  private undoStack: Construction[] = [];
  private redoStack: Construction[] = [];
  get selection(): TrackPiece | undefined {
    return this.state.pieces.find((p) => p.id === this.selected);
  }
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  edit(change: (state: Construction) => void): void {
    this.undoStack.push(structuredClone(this.state));
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
    change(this.state);
    this.state.connections = reconcileConnections(this.state.connections, this.state.pieces);
  }
  undo(): void {
    const state = this.undoStack.pop();
    if (!state) return;
    this.redoStack.push(structuredClone(this.state));
    this.state = state;
    this.cancel();
  }
  redo(): void {
    const state = this.redoStack.pop();
    if (!state) return;
    this.undoStack.push(structuredClone(this.state));
    this.state = state;
    this.cancel();
  }
  load(state: Construction): void {
    this.edit(() => {
      this.state = structuredClone(state);
    });
    this.cancel();
  }
  cancel(): void {
    this.preview = undefined;
    this.snap = undefined;
    this.selected = undefined;
  }
  choose(type: string): void {
    this.preview = createPiece(
      type,
      this.selection?.position ? [...this.selection.position] : [0, 3, 0],
    );
    // Start at the selected exit (or last open exit) so tap-only building is sufficient.
    const targets = this.selection ? [this.selection] : [...this.state.pieces].reverse();
    for (const target of targets) {
      const output = definition(target.type).connectors.find(
        (p) =>
          p.flow === 'out' &&
          !this.state.connections.some(
            (c) =>
              (c.a === target.id && c.portA === p.id) || (c.b === target.id && c.portB === p.id),
          ),
      );
      const input = definition(type).connectors.find((p) => p.flow === 'in');
      if (!output || !input) continue;
      this.preview = alignToOutput(this.preview, input, target, output);
      break;
    }
    this.updatePreview(this.preview.position);
  }
  updatePreview(position: Vec3): void {
    if (!this.preview) return;
    const point = position.map((v) => (this.grid ? Math.round(v * 2) / 2 : v)) as Vec3;
    this.preview = { ...this.preview, position: point };
    this.snap =
      this.state.buildMode === 'snap'
        ? findSnap(this.preview, this.state.pieces, this.state.connections)
        : undefined;
  }
  place(): boolean {
    if (!this.preview || this.state.pieces.length >= MAX_PIECES) return false;
    const piece = structuredClone(this.snap?.piece ?? this.preview);
    const connection = this.snap?.connection;
    this.edit((s) => {
      s.pieces.push(piece);
      if (connection) s.connections.push(connection);
    });
    this.preview = undefined;
    this.snap = undefined;
    this.selected = piece.id;
    return true;
  }
  moveSelected(position: Vec3, commit = true): void {
    const selected = this.selection;
    if (!selected) return;
    let next = { ...selected, position };
    const connections = this.state.connections.filter(
      (c) => c.a !== selected.id && c.b !== selected.id,
    );
    const snap =
      this.state.buildMode === 'snap' ? findSnap(next, this.state.pieces, connections) : undefined;
    if (snap) next = snap.piece;
    const change = (s: Construction): void => {
      s.pieces = s.pieces.map((p) => (p.id === selected.id ? next : p));
      s.connections = connections;
      if (snap) s.connections.push(snap.connection);
    };
    if (commit) this.edit(change);
    else change(this.state);
  }
  transform(axis: 'x' | 'y' | 'z', value: number, rotate = false): void {
    const piece = this.preview ?? this.selection;
    if (!piece) return;
    const next = structuredClone(piece);
    if (rotate) {
      const euler = new Euler(
        axis === 'x' ? value : 0,
        axis === 'y' ? value : 0,
        axis === 'z' ? value : 0,
      );
      next.rotation = new Quaternion()
        .setFromEuler(euler)
        .multiply(new Quaternion(...piece.rotation))
        .toArray();
    } else {
      next.position[axis === 'x' ? 0 : axis === 'y' ? 1 : 2] += value;
    }
    if (this.preview) {
      this.preview = next;
      this.updatePreview(next.position);
    } else
      this.edit((s) => {
        s.pieces = s.pieces.map((p) => (p.id === piece.id ? next : p));
      });
  }
  duplicate(): void {
    const piece = this.selection;
    if (!piece) return;
    this.preview = {
      ...structuredClone(piece),
      id: crypto.randomUUID(),
      position: [piece.position[0] + 1.5, piece.position[1], piece.position[2]],
    };
    this.updatePreview(this.preview.position);
  }
  delete(): void {
    const id = this.selected;
    this.edit((s) => {
      s.pieces = s.pieces.filter((p) => p.id !== id);
    });
    this.selected = undefined;
  }
}
import { alignPiece as alignToOutput } from './ConnectionSystem3D';
