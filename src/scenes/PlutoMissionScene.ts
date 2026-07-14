import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { goToScene } from '../core/SceneTransitions';
import { actions, preferences, progress } from '../core/services';
import { createPlutoPuzzle, PLUTO_PIECES } from '../games/pluto/rules';
import { placePuzzlePiece, type PlacementPuzzleState } from '../games/puzzle/rules';
import { addButton } from '../ui/button';
import { enableDragPlacement } from '../ui/DragPlacement';
import { MenuFocus } from '../ui/MenuFocus';

const STARTS = [
  [150, 205],
  [335, 205],
  [150, 385],
  [335, 385],
  [355, 555],
] as const;
const TARGETS = [
  [765, 270],
  [875, 270],
  [820, 355],
  [780, 440],
  [860, 440],
] as const;
const SNAP_DISTANCE = 115;

export class PlutoMissionScene extends Phaser.Scene {
  private puzzle: PlacementPuzzleState = createPlutoPuzzle();
  private pieces: Phaser.GameObjects.Container[] = [];
  private targets: Phaser.GameObjects.Rectangle[] = [];
  private pieceFocus = new MenuFocus(PLUTO_PIECES.length);
  private targetFocus = new MenuFocus(TARGETS.length);
  private heldPieceId: string | undefined;
  private paused = false;
  private pausePanel: Phaser.GameObjects.Container | undefined;
  private instruction!: Phaser.GameObjects.Text;
  private cleanupDrag: Array<() => void> = [];
  private finishing = false;

  constructor() {
    super('PlutoMission');
  }

  create(): void {
    this.puzzle = createPlutoPuzzle();
    this.pieces = [];
    this.targets = [];
    this.cleanupDrag = [];
    this.heldPieceId = undefined;
    this.paused = false;
    this.finishing = false;
    this.cameras.main.setBackgroundColor('#101d35');
    this.add.text(35, 32, "Pluto's Heart Puzzle", {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(35, 80, 'Put each numbered piece into the matching space.', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#d7e8ff',
    });
    addButton(this, 1120, 55, 'Pause', () => this.togglePause(), 210);

    this.add.circle(820, 365, 255, 0xd6b38a).setStrokeStyle(8, 0xf5eee5);
    this.add.circle(735, 250, 38, 0xb88769);
    this.add.circle(930, 410, 55, 0xb88769);
    this.add
      .text(820, 355, '♥', { fontFamily: 'Arial', fontSize: '330px', color: '#f2e6dc' })
      .setOrigin(0.5)
      .setAlpha(0.55);

    TARGETS.forEach(([x, y], index) => {
      const target = this.add
        .rectangle(x, y, 104, 78, 0xffffff, 0.16)
        .setStrokeStyle(4, 0xffffff, 0.8);
      this.add
        .text(x, y, String(index + 1), {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: '#504039',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.targets.push(target);
    });

    PLUTO_PIECES.forEach((definition, index) => {
      const start = STARTS[index];
      if (!start) throw new Error(`Missing start position for Pluto piece ${definition.id}.`);
      const block = this.add
        .rectangle(0, 0, 104, 78, index % 2 ? 0xf7eee8 : 0xe8d3c4)
        .setStrokeStyle(5, 0x704f43);
      const mark = this.add
        .text(0, 0, String(index + 1), {
          fontFamily: 'Arial',
          fontSize: '34px',
          color: '#50372f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const piece = this.add.container(start[0], start[1], [block, mark]).setSize(110, 86);
      this.cleanupDrag.push(
        enableDragPlacement(this, piece, {
          onSelect: () => {
            this.pieceFocus.set(index);
            this.refreshFocus();
          },
          onDrop: (x, y) => this.dropDraggedPiece(index, x, y),
        }),
      );
      this.pieces.push(piece);
    });
    this.instruction = this.add
      .text(805, 665, '', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#fff4c2',
        align: 'center',
      })
      .setOrigin(0.5);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.cleanupDrag.forEach((cleanup) => cleanup()),
    );
    this.refreshFocus();
  }

  update(): void {
    if (actions.wasPressed('pause')) this.togglePause();
    if (this.paused || this.finishing) return;
    if (this.heldPieceId) this.updateTargetControls();
    else this.updatePieceControls();
  }

  private updatePieceControls(): void {
    if (actions.wasPressed('moveRight') || actions.wasPressed('moveDown')) {
      this.movePieceFocus(1);
      this.refreshFocus();
    }
    if (actions.wasPressed('moveLeft') || actions.wasPressed('moveUp')) {
      this.movePieceFocus(-1);
      this.refreshFocus();
    }
    if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction')) {
      const definition = PLUTO_PIECES[this.pieceFocus.current];
      if (definition && !this.puzzle.placedIds.has(definition.id)) {
        this.heldPieceId = definition.id;
        this.refreshFocus();
      }
    }
    if (actions.wasPressed('cancel')) goToScene(this, 'PlanetSelect');
  }

  private updateTargetControls(): void {
    const heldPieceId = this.heldPieceId;
    if (!heldPieceId) return;
    if (actions.wasPressed('moveRight') || actions.wasPressed('moveDown')) {
      this.targetFocus.next();
      this.refreshFocus();
    }
    if (actions.wasPressed('moveLeft') || actions.wasPressed('moveUp')) {
      this.targetFocus.previous();
      this.refreshFocus();
    }
    if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction'))
      this.attemptPlacement(this.pieceIndex(heldPieceId), this.targetFocus.current);
    if (actions.wasPressed('cancel')) {
      const index = this.pieceIndex(heldPieceId);
      this.heldPieceId = undefined;
      this.returnPiece(index);
      this.refreshFocus();
    }
  }

  private dropDraggedPiece(pieceIndex: number, x: number, y: number): void {
    if (this.paused || this.puzzle.placedIds.has(PLUTO_PIECES[pieceIndex]?.id ?? '')) return;
    let closest = -1;
    let distance = Number.POSITIVE_INFINITY;
    TARGETS.forEach(([targetX, targetY], index) => {
      const candidate = Phaser.Math.Distance.Between(x, y, targetX, targetY);
      if (candidate < distance) {
        distance = candidate;
        closest = index;
      }
    });
    if (closest >= 0 && distance <= SNAP_DISTANCE) this.attemptPlacement(pieceIndex, closest);
    else {
      this.heldPieceId = undefined;
      this.returnPiece(pieceIndex);
      this.refreshFocus();
    }
  }

  private attemptPlacement(pieceIndex: number, targetIndex: number): void {
    const definition = PLUTO_PIECES[pieceIndex];
    const targetDefinition = PLUTO_PIECES[targetIndex];
    if (!definition || !targetDefinition) return;
    const result = placePuzzlePiece(this.puzzle, definition.id, targetDefinition.targetId);
    this.puzzle = result.state;
    this.heldPieceId = undefined;
    if (result.correct) {
      const target = TARGETS[targetIndex];
      const piece = this.pieces[pieceIndex];
      if (target && piece) {
        piece.setPosition(target[0], target[1]).disableInteractive().setScale(1);
        this.targets[targetIndex]?.setStrokeStyle(4, 0x79c99e);
      }
      playPlacementTone(preferences.current.muted);
      if (!preferences.current.reducedMotion && piece)
        this.tweens.add({ targets: piece, scale: 1.12, duration: 150, yoyo: true });
      if (this.puzzle.complete) this.completePuzzle();
      else this.movePieceFocus(1);
    } else this.returnPiece(pieceIndex);
    this.refreshFocus();
  }

  private returnPiece(index: number): void {
    const start = STARTS[index];
    const piece = this.pieces[index];
    if (!start || !piece) return;
    if (preferences.current.reducedMotion) piece.setPosition(start[0], start[1]);
    else
      this.tweens.add({
        targets: piece,
        x: start[0],
        y: start[1],
        duration: 280,
        ease: 'Sine.easeOut',
      });
  }

  private movePieceFocus(direction: 1 | -1): void {
    for (let count = 0; count < PLUTO_PIECES.length; count += 1) {
      if (direction === 1) this.pieceFocus.next();
      else this.pieceFocus.previous();
      const piece = PLUTO_PIECES[this.pieceFocus.current];
      if (piece && !this.puzzle.placedIds.has(piece.id)) return;
    }
  }

  private refreshFocus(): void {
    this.pieces.forEach((piece, index) =>
      piece.setScale(
        index === this.pieceFocus.current &&
          !this.puzzle.placedIds.has(PLUTO_PIECES[index]?.id ?? '')
          ? 1.08
          : 1,
      ),
    );
    this.targets.forEach((target, index) =>
      target.setStrokeStyle(
        index === this.targetFocus.current && this.heldPieceId ? 7 : 4,
        index === this.targetFocus.current && this.heldPieceId ? 0xffd65a : 0xffffff,
      ),
    );
    if (this.heldPieceId) {
      const piece = this.pieces[this.pieceIndex(this.heldPieceId)];
      const target = TARGETS[this.targetFocus.current];
      if (piece && target) piece.setPosition(target[0], target[1]);
      this.instruction.setText('Choose a numbered space, then press Go. Cancel returns the piece.');
    } else this.instruction.setText('Choose a piece, then press Go to pick it up.');
  }

  private pieceIndex(id: string): number {
    return PLUTO_PIECES.findIndex((piece) => piece.id === id);
  }

  private completePuzzle(): void {
    this.finishing = true;
    progress.unlock('pluto');
    this.add
      .text(820, 360, "Pluto's heart is complete!", {
        fontFamily: 'Arial',
        fontSize: '43px',
        color: '#17324d',
        backgroundColor: '#fff4c2',
        padding: { x: 24, y: 18 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.time.delayedCall(preferences.current.reducedMotion ? 350 : 850, () =>
      goToScene(this, 'FactCard', { planetId: 'pluto' }),
    );
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (!this.paused) {
      this.pausePanel?.destroy();
      this.pausePanel = undefined;
      return;
    }
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.9).setOrigin(0);
    const title = this.add
      .text(640, 220, 'Paused', {
        fontFamily: 'Arial',
        fontSize: '54px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const resume = addButton(this, 640, 350, 'Keep Puzzling', () => this.togglePause(), 360);
    const leave = addButton(
      this,
      640,
      460,
      'Planet Selection',
      () => goToScene(this, 'PlanetSelect'),
      360,
    );
    this.pausePanel = this.add.container(0, 0, [shade, title, resume, leave]).setDepth(30);
  }
}
