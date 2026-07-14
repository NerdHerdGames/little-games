import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { goToScene } from '../core/SceneTransitions';
import { actions, preferences, progress } from '../core/services';
import {
  createHaumeaMission,
  HAUMEA_ORBIT_RADIANS_PER_MS,
  HAUMEA_TIMING_TOLERANCE,
} from '../games/haumea/rules';
import {
  angularDistance,
  attemptTimingMatch,
  FULL_TURN,
  REDUCED_MOTION_STEP,
  type TimingMatchState,
} from '../games/timing/rules';
import { addButton } from '../ui/button';

const CENTER_X = 710;
const CENTER_Y = 365;
const ORBIT_X = 300;
const ORBIT_Y = 225;
const SYMBOL_COUNT = 5;
const REDUCED_STEP_INTERVAL = 430;
const SYMBOL_NAMES = ['Circle', 'Triangle', 'Square', 'Star', 'Diamond'] as const;

export class HaumeaMissionScene extends Phaser.Scene {
  private mission: TimingMatchState = createHaumeaMission();
  private symbols: Phaser.GameObjects.Container[] = [];
  private haumea!: Phaser.GameObjects.Ellipse;
  private progressText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private targetLabel!: Phaser.GameObjects.Text;
  private targetPreview: Phaser.GameObjects.Container | undefined;
  private stepElapsed = 0;
  private paused = false;
  private finishing = false;
  private pausePanel: Phaser.GameObjects.Container | undefined;

  constructor() {
    super('HaumeaMission');
  }

  create(): void {
    this.mission = createHaumeaMission();
    this.symbols = [];
    this.stepElapsed = 0;
    this.paused = false;
    this.finishing = false;
    this.targetPreview = undefined;
    this.cameras.main.setBackgroundColor('#10243d');
    this.add.text(35, 30, "Haumea's Speedy Spin", {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(35, 78, 'Press Go when the matching shape reaches the golden zone.', {
      fontFamily: 'Arial',
      fontSize: '21px',
      color: '#d7e8ff',
      wordWrap: { width: 700 },
    });
    addButton(this, 1125, 55, 'Pause', () => this.togglePause(), 205);

    this.add
      .ellipse(CENTER_X, CENTER_Y, ORBIT_X * 2, ORBIT_Y * 2)
      .setStrokeStyle(4, 0x6f91b5)
      .setFillStyle(0, 0);
    this.haumea = this.add
      .ellipse(CENTER_X, CENTER_Y, 310, 155, 0xcfe9ef)
      .setStrokeStyle(7, 0xffffff);
    this.add
      .ellipse(CENTER_X, CENTER_Y, 420, 115)
      .setStrokeStyle(7, 0xfff4c2, 0.85)
      .setFillStyle(0, 0);
    this.add.circle(CENTER_X - 75, CENTER_Y - 12, 24, 0xaccbd2);
    this.add.circle(CENTER_X + 55, CENTER_Y + 20, 18, 0xaccbd2);

    for (let index = 0; index < SYMBOL_COUNT; index += 1) {
      const symbol = this.createSymbol(0, 0, index, 1);
      this.symbols.push(symbol);
    }

    this.add
      .rectangle(CENTER_X + ORBIT_X, CENTER_Y, 92, 150, 0xffd65a, 0.16)
      .setStrokeStyle(7, 0xffd65a);
    this.add
      .text(CENTER_X + ORBIT_X, CENTER_Y - 105, 'MATCH HERE', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add.rectangle(205, 295, 270, 250, 0x1d3d5d).setStrokeStyle(5, 0x7fa5c7);
    this.add
      .text(205, 205, 'Find this shape:', {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.targetLabel = this.add
      .text(205, 375, '', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.progressText = this.add
      .text(205, 470, '', {
        fontFamily: 'Arial',
        fontSize: '27px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.feedbackText = this.add
      .text(205, 540, 'Watch the shapes orbit.', {
        fontFamily: 'Arial',
        fontSize: '21px',
        color: '#d7e8ff',
        align: 'center',
        wordWrap: { width: 300 },
      })
      .setOrigin(0.5);
    this.refreshTarget();
    this.positionSymbols();
  }

  update(_time: number, delta: number): void {
    if (actions.wasPressed('pause')) this.togglePause();
    if (this.paused || this.finishing) return;
    if (preferences.current.reducedMotion) {
      this.stepElapsed += Math.min(delta, 50);
      if (this.stepElapsed >= REDUCED_STEP_INTERVAL) {
        this.stepElapsed -= REDUCED_STEP_INTERVAL;
        this.mission.phase = (this.mission.phase + REDUCED_MOTION_STEP) % FULL_TURN;
        this.positionSymbols();
      }
    } else {
      this.mission.phase =
        (this.mission.phase + Math.min(delta, 50) * HAUMEA_ORBIT_RADIANS_PER_MS) % FULL_TURN;
      this.haumea.rotation = this.mission.phase;
      this.positionSymbols();
    }
    if (actions.wasPressed('primaryAction') || actions.wasPressed('confirm')) this.tryMatch();
    if (actions.wasPressed('cancel')) goToScene(this, 'PlanetSelect');
  }

  private tryMatch(): void {
    const targetIndex = this.mission.matches;
    const targetAngle = this.mission.phase + (targetIndex * FULL_TURN) / SYMBOL_COUNT;
    const result = attemptTimingMatch(
      this.mission,
      angularDistance(targetAngle, 0),
      HAUMEA_TIMING_TOLERANCE,
    );
    this.mission = result.state;
    if (result.matched) {
      playPlacementTone(preferences.current.muted);
      this.feedbackText.setText('Matched! Nicely timed.');
      if (!preferences.current.reducedMotion && this.targetPreview)
        this.tweens.add({ targets: this.targetPreview, scale: 1.45, duration: 140, yoyo: true });
      if (this.mission.complete) this.completeMission();
      else this.refreshTarget();
    } else this.feedbackText.setText('Almost! Let it move a little closer.');
  }

  private positionSymbols(): void {
    this.symbols.forEach((symbol, index) => {
      const angle = this.mission.phase + (index * FULL_TURN) / SYMBOL_COUNT;
      symbol.setPosition(
        CENTER_X + Math.cos(angle) * ORBIT_X,
        CENTER_Y + Math.sin(angle) * ORBIT_Y,
      );
      symbol.setScale(index === this.mission.matches ? 1.16 : 1);
    });
  }

  private refreshTarget(): void {
    this.targetPreview?.destroy();
    const index = this.mission.matches;
    this.targetPreview = this.createSymbol(205, 290, index, 1.25);
    this.targetLabel.setText(SYMBOL_NAMES[index] ?? 'Shape');
    this.progressText.setText(`Matches: ${'★'.repeat(index)}${'○'.repeat(SYMBOL_COUNT - index)}`);
    this.positionSymbols();
  }

  private createSymbol(
    x: number,
    y: number,
    index: number,
    scale: number,
  ): Phaser.GameObjects.Container {
    const colors = [0x69c6e8, 0xff9e80, 0x9fdb84, 0xffd65a, 0xc8a2e8] as const;
    const color = colors[index] ?? 0xffffff;
    let shape: Phaser.GameObjects.Shape;
    if (index === 0) shape = this.add.circle(0, 0, 35, color);
    else if (index === 1)
      shape = this.add.triangle(0, 0, 0, 65, 35, 0, 70, 65, color).setOrigin(0.5);
    else if (index === 2) shape = this.add.rectangle(0, 0, 65, 65, color);
    else if (index === 3) shape = this.add.star(0, 0, 5, 18, 38, color);
    else shape = this.add.polygon(0, 0, [0, -38, 38, 0, 0, 38, -38, 0], color);
    shape.setStrokeStyle(5, 0xffffff);
    return this.add.container(x, y, [shape]).setScale(scale);
  }

  private completeMission(): void {
    this.finishing = true;
    progress.unlock('haumea');
    this.add
      .text(710, 360, 'Five matches! Wonderful spinning!', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#17324d',
        backgroundColor: '#fff4c2',
        padding: { x: 24, y: 18 },
        fontStyle: 'bold',
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
