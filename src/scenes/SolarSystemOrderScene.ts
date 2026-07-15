import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { actions, preferences } from '../core/services';
import {
  createSolarOrderGame,
  placeSolarObject,
  SOLAR_ORDER_NAMES,
  SOLAR_SYSTEM_ORDER,
  type SolarOrderId,
  type SolarOrderState,
} from '../games/solar-system-order/rules';
import { addButton } from '../ui/button';
import { enableDragPlacement } from '../ui/DragPlacement';

const TRAY_X = [100, 280, 460, 640, 820, 1000, 1180] as const;
const SLOT_X = TRAY_X;
const SLOT_Y = [345, 485] as const;
const TRAY_Y = [125, 215] as const;

interface OrderPiece {
  id: SolarOrderId;
  display: Phaser.GameObjects.Container;
  trayX: number;
  trayY: number;
  cleanupDrag: () => void;
  placed: boolean;
}

export class SolarSystemOrderScene extends Phaser.Scene {
  private order: SolarOrderState = createSolarOrderGame();
  private pieces: OrderPiece[] = [];
  private feedbackText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private locked = false;

  constructor() {
    super('SolarSystemOrder');
  }

  create(): void {
    this.order = createSolarOrderGame();
    this.pieces = [];
    this.locked = false;
    this.cameras.main.setBackgroundColor('#10243d');
    this.add.text(25, 16, 'Solar System Order', {
      fontFamily: 'Arial',
      fontSize: '39px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(25, 61, 'Drag each object into its distance-from-the-Sun slot.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#d7e8ff',
    });
    this.progressText = this.add
      .text(760, 44, '', {
        fontFamily: 'Arial',
        fontSize: '23px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 1135, 46, 'Game Library', () => this.scene.start('GameHub'), 240);
    this.add
      .text(640, 95, 'All fourteen choices shown • pictures and spaces are not to scale', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#b9d9e5',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    for (const id of SOLAR_SYSTEM_ORDER) {
      const display = this.createObject(id, 0, 125).setDepth(15);
      const cleanupDrag = enableDragPlacement(this, display, {
        onSelect: () => display.setDepth(30),
        onDrop: (x, y) => this.dropObject(id, x, y),
      });
      this.pieces.push({ id, display, trayX: 0, trayY: 125, cleanupDrag, placed: false });
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const piece of this.pieces) piece.cleanupDrag();
    });

    this.add.rectangle(640, 420, 1220, 300, 0xfffbec).setStrokeStyle(8, 0x7fa5c7);
    this.add
      .text(62, 292, 'NEAR', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#46627a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(62, 535, 'FAR', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#46627a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    SOLAR_SYSTEM_ORDER.forEach((_id, index) => {
      const { x, y } = this.slotPosition(index);
      this.add.ellipse(x, y, 140, 102, 0xe7f0f4).setStrokeStyle(5, 0x46627a);
      this.add
        .text(x, y - 34, `${index + 1}`, {
          fontFamily: 'Arial',
          fontSize: '17px',
          color: '#17324d',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      if (index % 7 !== 6) {
        const firstRow = index < 7;
        this.add
          .text(x + (firstRow ? 89 : -89), y, firstRow ? '→' : '←', {
            fontFamily: 'Arial',
            fontSize: '25px',
            color: '#7fa5c7',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
      }
    });
    this.add
      .text(1215, 390, '↓', {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#7fa5c7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(640, 600, 'Place any object into its correct numbered slot.', {
        fontFamily: 'Arial',
        fontSize: '23px',
        color: '#d7e8ff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 850 },
      })
      .setOrigin(0.5);
    this.refreshTray();
  }

  update(): void {
    if (actions.wasPressed('cancel')) this.scene.start('GameHub');
  }

  private dropObject(id: SolarOrderId, x: number, y: number): void {
    const piece = this.pieces.find((item) => item.id === id);
    if (!piece) return;
    if (this.locked || piece.placed) {
      piece.display.setPosition(piece.trayX, piece.trayY).setDepth(15);
      return;
    }
    const slotIndex = this.closestSlot(x, y);
    const result = placeSolarObject(this.order, id, slotIndex);
    if (!result.correct) {
      piece.display.setPosition(piece.trayX, piece.trayY).setDepth(15);
      this.feedbackText.setText(result.message);
      return;
    }

    this.order = result.state;
    piece.placed = true;
    piece.cleanupDrag();
    const correctSlot = SOLAR_SYSTEM_ORDER.indexOf(id);
    const target = this.slotPosition(correctSlot);
    piece.display.setPosition(target.x, target.y + 8).setDepth(20);
    this.feedbackText.setText(result.message);
    playPlacementTone(preferences.current.muted);
    if (!preferences.current.reducedMotion)
      this.tweens.add({ targets: piece.display, scale: 1.12, duration: 170, yoyo: true });
    this.locked = true;
    this.time.delayedCall(preferences.current.reducedMotion ? 100 : 350, () => {
      this.locked = false;
      this.refreshTray();
      if (this.order.complete) this.completeGame();
    });
  }

  private refreshTray(): void {
    const visibleIds = this.order.trayOrder.filter((id) => !this.order.placed.includes(id));
    for (const piece of this.pieces) {
      if (piece.placed) continue;
      const trayIndex = visibleIds.indexOf(piece.id);
      piece.display.setVisible(trayIndex >= 0);
      if (trayIndex >= 0) {
        piece.trayX = TRAY_X[trayIndex % 7] ?? 100;
        piece.trayY = TRAY_Y[Math.floor(trayIndex / 7)] ?? 125;
        piece.display.setPosition(piece.trayX, piece.trayY).setDepth(15);
      }
    }
    this.progressText.setText(`Placed: ${this.order.placed.length} of 14`);
  }

  private closestSlot(x: number, y: number): number {
    let closest = -1;
    let distance = 78;
    SOLAR_SYSTEM_ORDER.forEach((_id, index) => {
      const slot = this.slotPosition(index);
      const candidate = Phaser.Math.Distance.Between(x, y, slot.x, slot.y);
      if (candidate < distance) {
        distance = candidate;
        closest = index;
      }
    });
    return closest;
  }

  private slotPosition(index: number): { x: number; y: number } {
    const row = Math.floor(index / 7);
    const column = index % 7;
    const xIndex = row === 0 ? column : 6 - column;
    return { x: SLOT_X[xIndex] ?? 100, y: SLOT_Y[row] ?? 345 };
  }

  private completeGame(): void {
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.9).setOrigin(0);
    const panel = this.add.rectangle(640, 350, 800, 430, 0xfffbec).setStrokeStyle(8, 0xffd65a);
    const title = this.add
      .text(640, 240, 'Wonderful! You ordered fourteen worlds from near to far!', {
        fontFamily: 'Arial',
        fontSize: '38px',
        color: '#17324d',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 690 },
      })
      .setOrigin(0.5);
    const replay = addButton(this, 500, 445, 'Play Again', () => this.scene.restart(), 250);
    const library = addButton(
      this,
      790,
      445,
      'Game Library',
      () => this.scene.start('GameHub'),
      250,
    );
    this.add.container(0, 0, [shade, panel, title, replay, library]).setDepth(100);
  }

  private createObject(id: SolarOrderId, x: number, y: number): Phaser.GameObjects.Container {
    const colors: Readonly<Record<SolarOrderId, number>> = {
      sun: 0xffd65a,
      mercury: 0xa9a49d,
      venus: 0xe2ad65,
      earth: 0x4e91d8,
      mars: 0xc96848,
      ceres: 0xb9a58d,
      jupiter: 0xd6ae82,
      saturn: 0xe4cf8c,
      uranus: 0x8bd4d5,
      neptune: 0x4168c7,
      pluto: 0xd6b38a,
      haumea: 0xcfe9ef,
      makemake: 0xc67c5a,
      eris: 0xe8edf1,
    };
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (id === 'saturn')
      parts.push(this.add.ellipse(0, -8, 80, 24).setStrokeStyle(7, 0xf2e1a9).setFillStyle(0, 0));
    if (id === 'haumea')
      parts.push(this.add.ellipse(0, -8, 58, 34, colors[id]).setStrokeStyle(3, 0xffffff));
    else {
      const radius = id === 'sun' ? 31 : id === 'jupiter' ? 28 : 23;
      parts.push(this.add.circle(0, -8, radius, colors[id]).setStrokeStyle(3, 0xffffff));
    }
    if (id === 'earth') parts.push(this.add.ellipse(-6, -10, 18, 10, 0x65b96f));
    if (id === 'jupiter') parts.push(this.add.rectangle(0, -8, 47, 6, 0xad745d));
    if (id === 'pluto') parts.push(this.add.ellipse(4, -7, 17, 16, 0xf2ddd0));
    const label = this.add
      .text(0, 32, SOLAR_ORDER_NAMES[id], {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#17324d',
        padding: { x: 4, y: 2 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    parts.push(label);
    return this.add.container(x, y, parts).setSize(130, 90);
  }
}
