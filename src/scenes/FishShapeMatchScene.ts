import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { actions, preferences } from '../core/services';
import {
  createFishShapeMatch,
  matchShapeFish,
  SHAPE_FISH,
  type FishColor,
  type FishShape,
  type FishShapeMatchState,
} from '../games/fish-shape-match/rules';
import { addButton } from '../ui/button';
import { enableDragPlacement } from '../ui/DragPlacement';

const TANK = { left: 35, right: 920, top: 125, bottom: 650 } as const;
const PANEL = { left: 965, right: 1245, top: 150, bottom: 625 } as const;

interface MovingFish {
  id: string;
  display: Phaser.GameObjects.Container;
  homeX: number;
  homeY: number;
  velocityX: number;
  velocityY: number;
  cleanupDrag: () => void;
  collected: boolean;
}

export class FishShapeMatchScene extends Phaser.Scene {
  private match: FishShapeMatchState = createFishShapeMatch();
  private fish: MovingFish[] = [];
  private activeDrag: string | undefined;
  private targetDisplay: Phaser.GameObjects.GameObject | undefined;
  private targetText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super('FishShapeMatch');
  }

  create(): void {
    this.match = createFishShapeMatch();
    this.fish = [];
    this.activeDrag = undefined;
    this.targetDisplay = undefined;
    this.cameras.main.setBackgroundColor('#10243d');
    this.add.text(25, 18, 'Fish Shape Match', {
      fontFamily: 'Arial',
      fontSize: '39px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(25, 64, 'Drag a fish with the requested shape into the matching panel.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#d7e8ff',
    });
    addButton(this, 1130, 48, 'Game Library', () => this.scene.start('GameHub'), 240);

    this.add
      .rectangle(477, 390, TANK.right - TANK.left, TANK.bottom - TANK.top, 0x55ace8)
      .setStrokeStyle(10, 0x2f7188);
    this.add.rectangle(477, 618, 865, 52, 0xe1c783, 0.8);
    for (let index = 0; index < 18; index += 1)
      this.add.circle(65 + ((index * 173) % 820), 150 + ((index * 113) % 420), 4, 0xffffff, 0.65);

    this.add
      .rectangle(
        (PANEL.left + PANEL.right) / 2,
        (PANEL.top + PANEL.bottom) / 2,
        PANEL.right - PANEL.left,
        PANEL.bottom - PANEL.top,
        0xfffbec,
      )
      .setStrokeStyle(9, 0xffd65a);
    this.add
      .text(1105, 205, 'Find this shape:', {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.targetText = this.add
      .text(1105, 390, '', {
        fontFamily: 'Arial',
        fontSize: '31px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.progressText = this.add
      .text(1105, 555, '', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#365c70',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    SHAPE_FISH.forEach((data, index) => {
      const x = 180 + (index % 3) * 275;
      const y = 220 + Math.floor(index / 3) * 175;
      const display = this.createFish(data.shape, data.color, x, y).setDepth(10);
      const cleanupDrag = enableDragPlacement(this, display, {
        onSelect: () => {
          this.activeDrag = data.id;
          display.setDepth(25);
        },
        onDrop: (dropX, dropY) => this.dropFish(data.id, dropX, dropY),
      });
      this.fish.push({
        id: data.id,
        display,
        homeX: x,
        homeY: y,
        velocityX: 26 + index * 3,
        velocityY: index % 2 === 0 ? 9 : -8,
        cleanupDrag,
        collected: false,
      });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fish of this.fish) fish.cleanupDrag();
      stopSpeaking();
    });

    this.feedbackText = this.add
      .text(477, 680, 'Look at the shape on each fish.', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#d7e8ff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 800 },
      })
      .setOrigin(0.5);
    this.refreshTarget();
  }

  update(_time: number, delta: number): void {
    if (actions.wasPressed('cancel')) this.scene.start('GameHub');
    const motionScale = preferences.current.reducedMotion ? 0.25 : 1;
    for (const fish of this.fish) {
      if (fish.collected || fish.id === this.activeDrag) continue;
      fish.homeX += (fish.velocityX * Math.min(delta, 40) * motionScale) / 1000;
      fish.homeY += (fish.velocityY * Math.min(delta, 40) * motionScale) / 1000;
      if (fish.homeX < TANK.left + 75 || fish.homeX > TANK.right - 75) {
        fish.velocityX *= -1;
        fish.display.setScale(Math.sign(fish.velocityX), 1);
      }
      if (fish.homeY < TANK.top + 55 || fish.homeY > TANK.bottom - 75) fish.velocityY *= -1;
      fish.display.setPosition(fish.homeX, fish.homeY);
    }
  }

  private dropFish(id: string, x: number, y: number): void {
    const fish = this.fish.find((item) => item.id === id);
    if (!fish || fish.collected) return;
    this.activeDrag = undefined;
    const inPanel = x >= PANEL.left && x <= PANEL.right && y >= PANEL.top && y <= PANEL.bottom;
    if (!inPanel) {
      fish.display.setPosition(fish.homeX, fish.homeY).setDepth(10);
      this.feedbackText.setText('Drag the fish into the panel on the right.');
      return;
    }

    const result = matchShapeFish(this.match, id);
    if (!result.correct) {
      fish.display.setPosition(fish.homeX, fish.homeY).setDepth(10);
      this.feedbackText.setText(result.message);
      return;
    }
    this.match = result.state;
    fish.collected = true;
    fish.cleanupDrag();
    fish.display.setVisible(false);
    this.feedbackText.setText(result.message);
    playPlacementTone(preferences.current.muted);
    speak(result.message, preferences.current.muted);
    this.refreshTarget();
    if (this.match.complete) this.completeGame();
  }

  private refreshTarget(): void {
    this.targetDisplay?.destroy();
    const target = this.match.target;
    if (target) {
      this.targetDisplay = this.createShape(target, 1105, 305, 0x263c68, 1.8).setDepth(5);
      this.targetText.setText(target[0]?.toUpperCase() + target.slice(1));
    } else this.targetText.setText('All matched!');
    this.progressText.setText(`Matched: ${this.match.collected} of 9`);
  }

  private completeGame(): void {
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.9).setOrigin(0);
    const panel = this.add.rectangle(640, 350, 760, 430, 0xfffbec).setStrokeStyle(8, 0xffd65a);
    const title = this.add
      .text(640, 245, 'You matched all nine shape fish!', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#17324d',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    const replay = addButton(this, 500, 440, 'Play Again', () => this.scene.restart(), 250);
    const library = addButton(
      this,
      790,
      440,
      'Game Library',
      () => this.scene.start('GameHub'),
      250,
    );
    this.add.container(0, 0, [shade, panel, title, replay, library]).setDepth(100);
  }

  private createFish(
    shape: FishShape,
    color: FishColor,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const colors: Readonly<Record<FishColor, number>> = {
      red: 0xe84141,
      green: 0x36b765,
      blue: 0x3975df,
    };
    const body = this.add.ellipse(0, 0, 118, 66, 0x1784d8).setStrokeStyle(4, 0xffffff);
    const tail = this.add.polygon(-34, 28, [0, 0, -45, -30, -45, 30], 0x1784d8);
    const badge = this.add.circle(5, 0, 24, 0xffffff).setStrokeStyle(3, 0x17324d);
    const symbol = this.createShape(shape, 5, 0, colors[color], 0.72);
    const eye = this.add.circle(42, -10, 5, 0x17324d);
    return this.add.container(x, y, [tail, body, badge, symbol, eye]).setSize(145, 95);
  }

  private createShape(
    shape: FishShape,
    x: number,
    y: number,
    color: number,
    scale: number,
  ): Phaser.GameObjects.Shape {
    if (shape === 'circle') return this.add.circle(x, y, 17 * scale, color);
    if (shape === 'square') return this.add.rectangle(x, y, 32 * scale, 32 * scale, color);
    return this.add
      .triangle(x, y, 0, 34 * scale, 17 * scale, 0, 34 * scale, 34 * scale, color)
      .setOrigin(0.5);
  }
}
