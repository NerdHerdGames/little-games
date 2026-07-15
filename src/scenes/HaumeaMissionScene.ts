import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { goToScene } from '../core/SceneTransitions';
import { actions, preferences, progress } from '../core/services';
import {
  addHaumeaSpin,
  createHaumeaMission,
  getHaumeaShape,
  type HaumeaSpinState,
} from '../games/haumea/rules';
import { addButton } from '../ui/button';
import { enableSwipeSpinControl } from '../ui/SwipeSpinControl';

const CENTER_X = 710;
const CENTER_Y = 365;
const HELD_SPIN_PER_MS = 1 / 7_000;
const SWIPE_SPIN_PER_PIXEL = 1 / 1_500;

export class HaumeaMissionScene extends Phaser.Scene {
  private mission: HaumeaSpinState = createHaumeaMission();
  private haumea!: Phaser.GameObjects.Container;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private paused = false;
  private finishing = false;
  private pausePanel: Phaser.GameObjects.Container | undefined;
  private disableSwipe: (() => void) | undefined;

  constructor() {
    super('HaumeaMission');
  }

  create(): void {
    this.mission = createHaumeaMission();
    this.paused = false;
    this.finishing = false;
    this.cameras.main.setBackgroundColor('#10243d');

    this.add.text(35, 30, "Haumea's Speedy Spin", {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(35, 78, 'Swipe Haumea, or hold any arrow, to spin it into an oval.', {
      fontFamily: 'Arial',
      fontSize: '21px',
      color: '#d7e8ff',
      wordWrap: { width: 800 },
    });
    addButton(this, 1125, 55, 'Pause', () => this.togglePause(), 205);

    this.add.ellipse(CENTER_X, CENTER_Y, 450, 230, 0x8fc6d4, 0.08).setStrokeStyle(4, 0x8fc6d4, 0.7);
    this.add
      .text(CENTER_X, 555, 'HAUMEA SHAPE', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#b9d9e5',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const body = this.add.circle(0, 0, 130, 0xcfe9ef).setStrokeStyle(7, 0xffffff);
    const patchLeft = this.add.ellipse(-56, -28, 52, 38, 0xa9ccd5);
    const patchRight = this.add.ellipse(52, 34, 42, 30, 0xa9ccd5);
    const band = this.add
      .ellipse(0, 0, 320, 92)
      .setFillStyle(0, 0)
      .setStrokeStyle(7, 0xfff4c2, 0.9);
    this.haumea = this.add.container(CENTER_X, CENTER_Y, [band, body, patchLeft, patchRight]);

    this.add.rectangle(205, 350, 290, 310, 0x1d3d5d).setStrokeStyle(5, 0x7fa5c7);
    this.add
      .text(205, 245, 'Spin power', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add.rectangle(205, 315, 230, 38, 0x0d1b2a).setStrokeStyle(4, 0xffffff);
    this.progressFill = this.add.rectangle(90, 315, 0, 30, 0xffd65a).setOrigin(0, 0.5);
    this.progressText = this.add
      .text(205, 370, '0% spun', {
        fontFamily: 'Arial',
        fontSize: '26px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.feedbackText = this.add
      .text(205, 450, 'Start with a round world.', {
        fontFamily: 'Arial',
        fontSize: '21px',
        color: '#d7e8ff',
        align: 'center',
        wordWrap: { width: 250 },
      })
      .setOrigin(0.5);

    const swipeZone = this.add.zone(CENTER_X, CENTER_Y, 570, 430).setDepth(5);
    this.disableSwipe = enableSwipeSpinControl(this, swipeZone, (distance) => {
      if (!this.paused && !this.finishing) this.applySpin(distance * SWIPE_SPIN_PER_PIXEL);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.disableSwipe?.();
      this.disableSwipe = undefined;
    });
    this.refreshDisplay();
  }

  update(_time: number, delta: number): void {
    if (actions.wasPressed('pause')) this.togglePause();
    if (this.paused || this.finishing) return;
    if (actions.wasPressed('cancel')) {
      goToScene(this, 'PlanetSelect');
      return;
    }

    const directionHeld =
      actions.isHeld('moveLeft') ||
      actions.isHeld('moveRight') ||
      actions.isHeld('moveUp') ||
      actions.isHeld('moveDown');
    if (directionHeld) this.applySpin(Math.min(delta, 50) * HELD_SPIN_PER_MS);
  }

  private applySpin(amount: number): void {
    const previous = this.mission.spin;
    this.mission = addHaumeaSpin(this.mission, amount);
    if (this.mission.spin === previous) return;
    if (!preferences.current.reducedMotion) this.haumea.rotation += amount * Math.PI * 2.5;
    this.refreshDisplay();
    if (this.mission.complete) this.completeMission();
  }

  private refreshDisplay(): void {
    const shape = getHaumeaShape(this.mission);
    this.haumea.setScale(shape.scaleX, shape.scaleY);
    const percent = Math.round(this.mission.spin * 100);
    this.progressFill.width = 230 * this.mission.spin;
    this.progressText.setText(`${percent}% spun`);
    if (percent >= 70) this.feedbackText.setText('Nearly Haumea-shaped!');
    else if (percent >= 30) this.feedbackText.setText('It is stretching into an oval!');
  }

  private completeMission(): void {
    this.finishing = true;
    progress.unlock('haumea');
    playPlacementTone(preferences.current.muted);
    this.add
      .text(710, 365, "Wonderful! You made Haumea's stretched shape!", {
        fontFamily: 'Arial',
        fontSize: '34px',
        color: '#17324d',
        backgroundColor: '#fff4c2',
        padding: { x: 24, y: 18 },
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.time.delayedCall(preferences.current.reducedMotion ? 350 : 850, () =>
      goToScene(this, 'FactCard', { planetId: 'haumea' }),
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
    const resume = addButton(this, 640, 350, 'Keep Spinning', () => this.togglePause(), 360);
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
