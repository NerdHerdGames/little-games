import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { goToScene } from '../core/SceneTransitions';
import { actions, preferences, progress } from '../core/services';
import {
  createErisJourney,
  ERIS_CHECKPOINT_IDS,
  reachErisCheckpoint,
  type ErisJourneyState,
} from '../games/eris/rules';
import { addButton } from '../ui/button';
import { createPlanetArt, preloadPlanetArt } from '../ui/PlanetArt';

const CHECKPOINTS = [
  [250, 285],
  [455, 490],
  [680, 245],
  [900, 480],
  [1100, 305],
] as const;
const ICE_OBJECTS = [
  [555, 365, 45],
  [800, 355, 52],
] as const;
const BOUNDS = { left: 75, right: 1205, top: 135, bottom: 620 } as const;

export class ErisMissionScene extends Phaser.Scene {
  private journey: ErisJourneyState = createErisJourney();
  private probe!: Phaser.GameObjects.Container;
  private sun!: Phaser.GameObjects.Container;
  private rings: Phaser.GameObjects.Arc[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private furthestX: number = BOUNDS.left;
  private paused = false;
  private finishing = false;
  private pausePanel: Phaser.GameObjects.Container | undefined;

  constructor() {
    super('ErisMission');
  }

  preload(): void {
    preloadPlanetArt(this, ['sun', 'eris']);
  }

  create(): void {
    this.journey = createErisJourney();
    this.rings = [];
    this.furthestX = BOUNDS.left;
    this.paused = false;
    this.finishing = false;
    this.cameras.main.setBackgroundColor('#071322');
    for (let index = 0; index < 38; index += 1)
      this.add.circle(
        30 + ((index * 239) % 1210),
        120 + ((index * 157) % 500),
        2 + (index % 3),
        0xd7e8ff,
      );
    this.add.text(35, 28, 'Journey to Eris', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(35, 76, 'Guide the probe through all five glowing rings.', {
      fontFamily: 'Arial',
      fontSize: '21px',
      color: '#d7e8ff',
    });
    this.add
      .text(640, 112, 'Visual distances and sizes are not to scale.', {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#aebfd1',
      })
      .setOrigin(0.5);
    addButton(this, 1120, 55, 'Pause', () => this.togglePause(), 210);
    this.sun = createPlanetArt(this, 'sun', 95, 360, { maxWidth: 140, maxHeight: 140 });
    this.add
      .text(95, 445, 'Sun', { fontFamily: 'Arial', fontSize: '20px', color: '#fff4c2' })
      .setOrigin(0.5);
    CHECKPOINTS.forEach(([x, y], index) => {
      const ring = this.add
        .circle(x, y, 48)
        .setStrokeStyle(10, 0x75d8ff)
        .setFillStyle(0x75d8ff, 0.08);
      this.add
        .text(x, y, String(index + 1), {
          fontFamily: 'Arial',
          fontSize: '27px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      if (!preferences.current.reducedMotion)
        this.tweens.add({
          targets: ring,
          alpha: 0.55,
          scale: 1.08,
          duration: 900,
          yoyo: true,
          repeat: -1,
        });
      this.rings.push(ring);
    });
    for (const [x, y, radius] of ICE_OBJECTS) {
      this.add
        .polygon(
          x,
          y,
          [-radius, -10, -20, -radius, radius, -25, radius - 8, radius, -30, radius - 5],
          0xa9c9d8,
        )
        .setStrokeStyle(5, 0xeaf7ff);
    }
    const body = this.add
      .triangle(0, 0, -38, 28, 42, 0, -38, -28, 0xefa647)
      .setStrokeStyle(4, 0xffffff);
    const window = this.add.circle(-7, 0, 12, 0x8dd8ef).setStrokeStyle(3, 0x17324d);
    const flame = this.add.triangle(-48, 0, 0, -12, -28, 0, 0, 12, 0xffd65a);
    this.probe = this.add.container(120, 350, [flame, body, window]);
    this.progressText = this.add
      .text(640, 665, '', {
        fontFamily: 'Arial',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.message = this.add
      .text(1000, 665, 'You can always circle back.', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#d7e8ff',
      })
      .setOrigin(0.5);
    this.refreshProgress();
  }

  update(_time: number, delta: number): void {
    if (actions.wasPressed('pause')) this.togglePause();
    if (this.paused || this.finishing) return;
    const speed = (235 * Math.min(delta, 40)) / 1000;
    let x = Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft'));
    let y = Number(actions.isHeld('moveDown')) - Number(actions.isHeld('moveUp'));
    if (x && y) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    this.probe.x = Phaser.Math.Clamp(this.probe.x + x * speed, BOUNDS.left, BOUNDS.right);
    this.probe.y = Phaser.Math.Clamp(this.probe.y + y * speed, BOUNDS.top, BOUNDS.bottom);
    this.applyGentleIcePush(speed);
    this.furthestX = Math.max(this.furthestX, this.probe.x);
    const travel = Phaser.Math.Clamp(
      (this.furthestX - BOUNDS.left) / (BOUNDS.right - BOUNDS.left),
      0,
      1,
    );
    this.sun.setScale(1 - travel * 0.68);
    this.checkCheckpoint();
    if (actions.wasPressed('cancel')) goToScene(this, 'PlanetSelect');
  }

  private applyGentleIcePush(speed: number): void {
    for (const [iceX, iceY, radius] of ICE_OBJECTS) {
      const distance = Phaser.Math.Distance.Between(this.probe.x, this.probe.y, iceX, iceY);
      if (distance < radius + 42 && distance > 0) {
        const push = speed * 0.42;
        this.probe.x = Phaser.Math.Clamp(
          this.probe.x + ((this.probe.x - iceX) / distance) * push,
          BOUNDS.left,
          BOUNDS.right,
        );
        this.probe.y = Phaser.Math.Clamp(
          this.probe.y + ((this.probe.y - iceY) / distance) * push,
          BOUNDS.top,
          BOUNDS.bottom,
        );
        this.message.setText('The ice gave the probe a gentle nudge.');
      }
    }
  }

  private checkCheckpoint(): void {
    const index = this.journey.nextIndex;
    const point = CHECKPOINTS[index];
    const id = ERIS_CHECKPOINT_IDS[index];
    if (
      !point ||
      !id ||
      Phaser.Math.Distance.Between(this.probe.x, this.probe.y, point[0], point[1]) > 68
    )
      return;
    const result = reachErisCheckpoint(this.journey, id);
    if (!result.reachedNow) return;
    this.journey = result.state;
    this.rings[index]?.setStrokeStyle(10, 0x8fe3a6).setFillStyle(0x8fe3a6, 0.25);
    playPlacementTone(preferences.current.muted);
    this.message.setText(`Checkpoint ${index + 1} reached!`);
    this.refreshProgress();
    if (this.journey.complete) this.completeJourney();
  }

  private refreshProgress(): void {
    this.progressText.setText(
      `Checkpoints: ${'★'.repeat(this.journey.reached.length)}${'○'.repeat(5 - this.journey.reached.length)}`,
    );
  }

  private completeJourney(): void {
    this.finishing = true;
    progress.unlock('eris');
    createPlanetArt(this, 'eris', 1090, 345, { maxWidth: 210, maxHeight: 210 }).setDepth(20);
    this.add
      .text(800, 345, 'You arrived at Eris!', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#17324d',
        backgroundColor: '#fff4c2',
        padding: { x: 24, y: 18 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(22);
    this.time.delayedCall(preferences.current.reducedMotion ? 350 : 900, () =>
      goToScene(this, 'FactCard', { planetId: 'eris' }),
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
    const resume = addButton(this, 640, 350, 'Keep Traveling', () => this.togglePause(), 360);
    const leave = addButton(
      this,
      640,
      460,
      'Planet Selection',
      () => goToScene(this, 'PlanetSelect'),
      360,
    );
    this.pausePanel = this.add.container(0, 0, [shade, title, resume, leave]).setDepth(40);
  }
}
