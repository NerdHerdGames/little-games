import Phaser from 'phaser';
import { PLAY_BOUNDS } from '../config/settings';
import { actions, preferences } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import {
  collectBrightSpot,
  createCeresMission,
  type CeresMissionState,
} from '../games/ceres/rules';
import { addButton } from '../ui/button';

const SPOTS = [
  [280, 250],
  [980, 240],
  [760, 500],
] as const;

export class CeresMissionScene extends Phaser.Scene {
  private rover!: Phaser.GameObjects.Container;
  private spots: Phaser.GameObjects.Arc[] = [];
  private mission: CeresMissionState = createCeresMission();
  private progressText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private paused = false;
  private pausePanel: Phaser.GameObjects.Container | undefined;
  constructor() {
    super('CeresMission');
  }

  create(): void {
    this.mission = createCeresMission();
    this.spots = [];
    this.paused = false;
    this.cameras.main.setBackgroundColor('#171d2a');
    this.add.rectangle(640, 365, 1100, 485, 0x675b52).setStrokeStyle(7, 0xb9a58d);
    for (const [x, y, radius] of [
      [390, 350, 70],
      [900, 390, 95],
      [600, 230, 48],
    ] as const)
      this.add.circle(x, y, radius, 0x554a43).setStrokeStyle(4, 0x82746a);
    this.add.text(48, 35, 'Ceres Bright Spot Search', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '38px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.progressText = this.add
      .text(635, 52, 'Bright spots: ○ ○ ○', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 1120, 55, 'Pause', () => this.togglePause(), 210);
    for (const [x, y] of SPOTS) {
      const spot = this.add.circle(x, y, 24, 0xfff4c2).setStrokeStyle(6, 0xffffff);
      if (!preferences.current.reducedMotion)
        this.tweens.add({
          targets: spot,
          alpha: 0.55,
          scale: 1.2,
          duration: 750,
          yoyo: true,
          repeat: -1,
        });
      this.spots.push(spot);
    }
    const body = this.add.rectangle(0, 0, 64, 45, 0xe9a23b).setStrokeStyle(4, 0x362713);
    const window = this.add.circle(0, -18, 17, 0x93d9ef).setStrokeStyle(3, 0x17324d);
    const wheels = this.add
      .text(0, 20, '●     ●', { fontFamily: 'Arial', fontSize: '20px', color: '#222222' })
      .setOrigin(0.5);
    this.rover = this.add.container(640, 390, [body, window, wheels]);
    this.hint = this.add
      .text(640, 675, 'Use the big arrows to guide the rover.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#fff4c2',
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    this.hint.setVisible(actions.lastInputMethod !== 'gamepad');
    if (actions.wasPressed('pause')) this.togglePause();
    if (this.paused || this.mission.complete) return;
    const speed = (300 * Math.min(delta, 40)) / 1000;
    let x = Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft'));
    let y = Number(actions.isHeld('moveDown')) - Number(actions.isHeld('moveUp'));
    if (x && y) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    const nextX = Phaser.Math.Clamp(
      this.rover.x + x * speed,
      PLAY_BOUNDS.left + 40,
      PLAY_BOUNDS.right - 40,
    );
    const nextY = Phaser.Math.Clamp(
      this.rover.y + y * speed,
      PLAY_BOUNDS.top + 40,
      PLAY_BOUNDS.bottom - 40,
    );
    if (!this.hitsCrater(nextX, this.rover.y)) this.rover.x = nextX;
    if (!this.hitsCrater(this.rover.x, nextY)) this.rover.y = nextY;
    for (const spot of this.spots)
      if (
        spot.visible &&
        Phaser.Math.Distance.Between(this.rover.x, this.rover.y, spot.x, spot.y) < 70
      )
        this.collect(spot);
  }

  private hitsCrater(x: number, y: number): boolean {
    return [
      [390, 350, 95],
      [900, 390, 120],
      [600, 230, 70],
    ].some(
      ([cx, cy, radius]) => Phaser.Math.Distance.Between(x, y, cx ?? 0, cy ?? 0) < (radius ?? 0),
    );
  }

  private collect(spot: Phaser.GameObjects.Arc): void {
    spot.setVisible(false);
    this.mission = collectBrightSpot(this.mission);
    this.progressText.setText(
      `Bright spots: ${Array.from({ length: 3 }, (_, index) => (index < this.mission.collected ? '★' : '○')).join(' ')}`,
    );
    if (this.mission.complete) {
      this.add
        .text(640, 330, 'All three found! Wonderful exploring!', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '40px',
          color: '#17324d',
          backgroundColor: '#fff4c2',
          padding: { x: 24, y: 18 },
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(20);
      this.time.delayedCall(preferences.current.reducedMotion ? 500 : 1300, () =>
        goToScene(this, 'FactCard', { planetId: 'ceres' }),
      );
    }
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (!this.paused) {
      this.pausePanel?.destroy();
      this.pausePanel = undefined;
      return;
    }
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.88).setOrigin(0);
    const title = this.add
      .text(640, 230, 'Paused', {
        fontFamily: 'Arial',
        fontSize: '54px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const resume = addButton(this, 640, 350, 'Keep Exploring', () => this.togglePause(), 360);
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
