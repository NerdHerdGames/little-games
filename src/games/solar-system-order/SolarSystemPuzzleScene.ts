import Phaser from 'phaser';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { actions, preferences } from '../../core/services';
import { addButton } from '../../ui/button';
import { enableDragPlacement } from '../../ui/DragPlacement';
import { createPlanetArt, preloadPlanetArt } from '../../ui/PlanetArt';
import { enableTapSelection } from '../../ui/TapSelection';
import {
  createSolarPuzzle,
  DWARF_WORLDS,
  findPuzzleSlot,
  PUZZLE_WORLDS,
  puzzleOrbit,
  puzzleSlot,
} from './puzzle';
import {
  placeSolarObject,
  SOLAR_ORDER_NAMES,
  SOLAR_SYSTEM_ORDER,
  type SolarOrderId,
} from './rules';

interface PuzzlePiece {
  id: SolarOrderId;
  display: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  cleanup: () => void;
  placed: boolean;
}

export class SolarSystemPuzzleScene extends Phaser.Scene {
  private state = createSolarPuzzle();
  private pieces: PuzzlePiece[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private hints = false;
  private feedback!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;

  constructor() {
    super('SolarSystemPuzzle');
  }

  preload(): void {
    preloadPlanetArt(this, SOLAR_SYSTEM_ORDER);
  }

  create(): void {
    this.state = createSolarPuzzle();
    this.pieces = [];
    this.slotLabels = [];
    this.hints = false;
    this.cameras.main.setBackgroundColor('#10243d');
    this.text(26, 15, 'Solar System Puzzle', 37, '#fff4c2').setOrigin(0);
    this.text(26, 63, 'Drag each world into its empty orbit slot.', 23).setOrigin(0);
    this.progress = this.text(750, 43, '0 / 13 placed', 23);
    addButton(this, 1135, 46, 'Game Library', () => this.scene.start('GameHub'), 240);
    const hint = addButton(
      this,
      1135,
      126,
      'Show Hints',
      () => {
        this.hints = !this.hints;
        const label = hint.list[1] as Phaser.GameObjects.Text;
        label.setText(this.hints ? 'Hide Hints' : 'Show Hints');
        this.refreshLabels();
      },
      240,
    );
    this.text(
      26,
      105,
      '○ Planet slot     ◇ Dwarf planet slot     •     Near the Sun → farther away',
      18,
    ).setOrigin(0);
    this.text(
      26,
      135,
      'Simplified sizes and positions • average distances • real orbits can overlap',
      17,
    ).setOrigin(0);

    const lines = this.add.graphics().lineStyle(2, 0x506a88, 0.65);
    PUZZLE_WORLDS.forEach((id, index) => {
      const orbit = puzzleOrbit(index);
      lines.beginPath();
      for (let step = 0; step <= 60; step += 1) {
        const angle = -1 + step / 30;
        const x = 70 + orbit.radiusX * Math.cos(angle);
        const y = 310 + orbit.radiusY * Math.sin(angle);
        if (step === 0) lines.moveTo(x, y);
        else lines.lineTo(x, y);
      }
      lines.strokePath();
      const slot = puzzleSlot(index);
      const dwarf = DWARF_WORLDS.has(id);
      if (dwarf) {
        this.add
          .rectangle(slot.x, slot.y, 82, 82, 0x233c57)
          .setAngle(45)
          .setStrokeStyle(3, 0xcab5ef);
      } else {
        this.add.circle(slot.x, slot.y, 54, 0x233c57).setStrokeStyle(3, 0x9acbe6);
      }
      this.text(slot.x, slot.y - 17, `${index + 1}`, 16, '#b9d9e5');
      this.slotLabels.push(this.text(slot.x, slot.y + 10, '?', 24, '#ffffff'));
    });
    createPlanetArt(this, 'sun', 70, 310, { maxWidth: 105, maxHeight: 105 });
    this.text(70, 380, 'Sun', 23, '#fff4c2');
    this.feedback = this.text(640, 480, 'Pick any planet or dwarf planet to begin!', 22, '#fff4c2');
    this.add.rectangle(640, 604, 1260, 204, 0x1b3550).setStrokeStyle(2, 0x506a88);

    const tray = this.state.trayOrder.filter((id) => id !== 'sun');
    tray.forEach((id, index) => {
      const home = { x: 100 + (index % 7) * 180, y: index < 7 ? 552 : 651 };
      const art = createPlanetArt(this, id, 0, -10, { maxWidth: 85, maxHeight: 60 });
      const name = this.text(0, 30, SOLAR_ORDER_NAMES[id], 18, '#ffffff');
      name.setBackgroundColor('#10243d').setPadding(4, 2);
      const display = this.add.container(home.x, home.y, [art, name]).setSize(140, 96).setDepth(10);
      const piece: PuzzlePiece = { id, display, home, placed: false, cleanup: () => {} };
      piece.cleanup = enableDragPlacement(this, display, {
        onSelect: () => display.setDepth(30),
        onDrop: (x, y) => this.drop(piece, x, y),
        onTap: () => speak(SOLAR_ORDER_NAMES[id], preferences.current.muted),
      });
      this.pieces.push(piece);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pieces.forEach((piece) => piece.cleanup());
      stopSpeaking();
    });
  }

  update(): void {
    if (actions.wasPressed('cancel')) this.scene.start('GameHub');
  }

  private drop(piece: PuzzlePiece, x: number, y: number): void {
    if (piece.placed || this.state.complete) return;
    const slotIndex = findPuzzleSlot(x, y);
    const result = placeSolarObject(this.state, piece.id, slotIndex < 0 ? -1 : slotIndex + 1);
    if (!result.correct) {
      piece.display.setPosition(piece.home.x, piece.home.y).setDepth(10);
      this.feedback.setText(
        slotIndex < 0 ? 'Drop your world inside an empty orbit slot.' : result.message,
      );
      return;
    }
    this.state = result.state;
    piece.placed = true;
    piece.cleanup();
    piece.cleanup = enableTapSelection(this, piece.display, () =>
      speak(SOLAR_ORDER_NAMES[piece.id], preferences.current.muted),
    );
    const target = puzzleSlot(slotIndex);
    piece.display.setPosition(target.x, target.y).setDepth(20);
    this.slotLabels[slotIndex]?.setVisible(false);
    this.feedback.setText(result.message);
    this.progress.setText(`${this.state.placed.length - 1} / 13 placed`);
    playPlacementTone(preferences.current.muted);
    if (!preferences.current.reducedMotion) {
      this.tweens.add({ targets: piece.display, scale: 1.1, duration: 180, yoyo: true });
    }
    if (this.state.complete) this.time.delayedCall(500, () => this.celebrate());
  }

  private refreshLabels(): void {
    this.slotLabels.forEach((label, index) => {
      const id = PUZZLE_WORLDS[index];
      if (id)
        label.setText(this.hints ? SOLAR_ORDER_NAMES[id] : '?').setFontSize(this.hints ? 17 : 24);
    });
  }

  private celebrate(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x10243d, 0.93);
    const panel = this.add.rectangle(640, 350, 820, 400, 0xfffbec).setStrokeStyle(6, 0xffd65a);
    const title = this.text(640, 240, 'You built the solar system!', 38, '#17324d');
    const message = this.text(
      640,
      315,
      'Eight planets and five dwarf planets, all in place.',
      25,
      '#17324d',
    );
    const replay = addButton(this, 490, 435, 'Play Again', () => this.scene.restart(), 250);
    const library = addButton(
      this,
      790,
      435,
      'Game Library',
      () => this.scene.start('GameHub'),
      250,
    );
    this.add.container(0, 0, [shade, panel, title, message, replay, library]).setDepth(100);
  }

  private text(
    x: number,
    y: number,
    value: string,
    size: number,
    color = '#d7e8ff',
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, { fontFamily: 'Arial', fontSize: `${size}px`, fontStyle: 'bold', color })
      .setOrigin(0.5);
  }
}
