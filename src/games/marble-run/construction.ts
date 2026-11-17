import type { ConstructionAction } from '../../input/ActionState';
import type { CameraController } from './camera';
import { disconnect, findSnap, hitPiece, worldPorts, type SnapResult } from './connections';
import { History, MAX_PIECES } from './document';
import { createPiece } from './registry';
import { clamp, copy, type Piece, type RunDocument } from './types';
/** Device-independent editor. Previews never mutate committed state or physics. */
export class ConstructionController {
  readonly history = new History();
  selected: string | undefined;
  brush: string | undefined;
  private brushAngle = 0;
  preview: Piece | undefined;
  snap: SnapResult | undefined;
  invalid = false;
  private dragging = false;
  private moving = false;
  private fresh = false;
  private offset = { x: 0, y: 0 };
  private start = { x: 0, y: 0 };
  private original: Piece | undefined;
  private previewAngle = 0;
  constructor(
    public document: RunDocument,
    readonly camera: CameraController,
    private readonly changed: () => void,
    private readonly announce: (message: string) => void,
  ) {}
  get selection(): Piece | undefined {
    return this.document.pieces.find((p) => p.id === this.selected);
  }
  get pending(): boolean {
    return this.dragging;
  }
  choose(type: string): void {
    this.cancel();
    this.brush = type;
    this.brushAngle = 0;
    this.selected = undefined;
    this.announce('Tap the board to place it, or drag a piece from the tray.');
  }
  handle(action: ConstructionAction, editing: boolean): void {
    const screen = { x: action.x, y: action.y };
    if (action.phase === 'zoom') {
      this.cancel();
      this.camera.zoomAt(action.dx, screen);
      return;
    }
    if (action.phase === 'pan') {
      this.cancel();
      this.camera.pan(action.dx, action.dy);
      return;
    }
    if (action.phase === 'cancel') {
      this.cancel();
      return;
    }
    const point = this.camera.world(screen);
    if (action.phase === 'start') {
      this.cancel();
      this.dragging = true;
      this.start = screen;
      this.moving = false;
      if (!editing) return;
      const type = action.source ?? this.brush;
      if (type) {
        if (this.document.pieces.length >= MAX_PIECES) {
          this.announce('The toy box has 300 pieces on the board. Try moving one!');
          this.dragging = false;
          return;
        }
        this.original = createPiece(type, point.x, point.y);
        this.original.angle = this.brushAngle;
        this.fresh = true;
        this.offset = { x: 0, y: 0 };
      } else {
        const piece = [...this.document.pieces]
          .reverse()
          .find((p) => hitPiece(point, p, Math.max(18, 22 / this.camera.zoom)));
        this.selected = piece?.id;
        this.original = piece ? copy(piece) : undefined;
        this.fresh = false;
        if (piece) this.offset = { x: piece.x - point.x, y: piece.y - point.y };
      }
      this.previewAngle = this.original?.angle ?? 0;
      if (this.original) this.updatePreview(point.x, point.y);
      return;
    }
    if (!this.dragging) return;
    if (action.phase === 'move') {
      if (Math.hypot(screen.x - this.start.x, screen.y - this.start.y) > 5) this.moving = true;
      if (this.original) this.updatePreview(point.x, point.y);
      else this.camera.pan(action.dx, action.dy);
    }
    if (action.phase === 'end') {
      if (this.original && this.preview && (this.moving || this.fresh)) {
        this.updatePreview(point.x, point.y);
        this.history.push(this.document);
        this.document.connections = disconnect(this.document.connections, this.preview.id);
        if (this.fresh) this.document.pieces.push(this.preview);
        else
          this.document.pieces = this.document.pieces.map((p) =>
            p.id === this.preview!.id ? this.preview! : p,
          );
        if (this.snap) this.document.connections.push(this.snap.connection);
        this.selected = this.preview.id;
        this.announce(this.snap ? 'Click! Pieces connected.' : 'Piece placed. Try a marble!');
        this.changed();
      }
      this.cancel();
    }
  }
  private updatePreview(x: number, y: number): void {
    if (!this.original) return;
    let piece = {
      ...copy(this.original),
      x: clamp(x + this.offset.x, -5800, 5800),
      y: clamp(y + this.offset.y, -5800, 5800),
      angle: this.previewAngle,
    };
    this.snap = undefined;
    this.invalid = false;
    const connections = disconnect(this.document.connections, piece.id);
    if (this.document.mode === 'snap') {
      this.snap = findSnap(piece, this.document.pieces, connections, 38 / this.camera.zoom);
      if (this.snap) piece = this.snap.piece;
      else {
        const sources = worldPorts(piece);
        this.invalid = this.document.pieces
          .filter((p) => p.id !== piece.id)
          .some((other) =>
            worldPorts(other).some((target) =>
              sources.some(
                (source) =>
                  Math.hypot(source.x - target.x, source.y - target.y) < 25 / this.camera.zoom,
              ),
            ),
          );
        if (this.document.grid) {
          piece.x = Math.round(piece.x / 20) * 20;
          piece.y = Math.round(piece.y / 20) * 20;
        }
      }
    }
    this.preview = piece;
  }
  cancel(): void {
    this.preview = undefined;
    this.original = undefined;
    this.snap = undefined;
    this.dragging = false;
    this.invalid = false;
  }
  rotate(direction: number): void {
    if (this.preview) {
      this.previewAngle += (direction * Math.PI) / 12;
      this.preview.angle = this.previewAngle;
      this.snap = undefined;
      return;
    }
    if (!this.selection) {
      if (this.brush) {
        this.brushAngle += (direction * Math.PI) / 12;
        this.announce(
          `Turned ${Math.round((this.brushAngle * 180) / Math.PI)} degrees. Tap the board to place it.`,
        );
      }
      return;
    }
    this.mutate(() => {
      this.selection!.angle += (direction * Math.PI) / 12;
      this.document.connections = disconnect(this.document.connections, this.selected!);
    });
  }
  reconnect(): void {
    const piece = this.selection;
    if (!piece) return;
    const snap = findSnap(
      piece,
      this.document.pieces,
      disconnect(this.document.connections, piece.id),
      65 / this.camera.zoom,
    );
    if (!snap) {
      this.announce('Move an end closer to an empty connection ring.');
      return;
    }
    this.mutate(() => {
      this.document.pieces = this.document.pieces.map((p) => (p.id === piece.id ? snap.piece : p));
      this.document.connections = disconnect(this.document.connections, piece.id);
      this.document.connections.push(snap.connection);
    });
    this.announce('Click! Pieces connected.');
  }
  duplicate(): void {
    const piece = this.selection;
    if (!piece || this.document.pieces.length >= MAX_PIECES) return;
    this.mutate(() => {
      const duplicate = {
        ...copy(piece),
        id: createPiece(piece.type, 0, 0).id,
        x: piece.x + 45,
        y: piece.y + 45,
      };
      this.document.pieces.push(duplicate);
      this.selected = duplicate.id;
      this.brush = undefined;
    });
  }
  delete(): void {
    if (!this.selection) return;
    this.mutate(() => {
      this.document.pieces = this.document.pieces.filter((p) => p.id !== this.selected);
      this.document.connections = disconnect(this.document.connections, this.selected!);
      this.selected = undefined;
    });
  }
  mutate(change: () => void): void {
    this.cancel();
    this.history.push(this.document);
    change();
    this.changed();
  }
  undo(): void {
    this.cancel();
    this.document = this.history.undo(this.document);
    this.selected = undefined;
    this.changed();
  }
  redo(): void {
    this.cancel();
    this.document = this.history.redo(this.document);
    this.selected = undefined;
    this.changed();
  }
  replace(document: RunDocument): void {
    this.mutate(() => {
      this.document = copy(document);
      this.selected = undefined;
      this.brush = undefined;
    });
    this.camera.fit(this.document.pieces);
  }
}
