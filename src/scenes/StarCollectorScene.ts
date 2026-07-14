import Phaser from 'phaser';
import { goToScene } from '../core/SceneTransitions';
import { actions, preferences } from '../core/services';
import { PLAY_BOUNDS } from '../config/settings';
import {
  collectStar,
  createStarCollector,
  type StarCollectorState,
} from '../games/star-collector/rules';
import { addButton } from '../ui/button';

const STAR_POSITIONS = [
  [260, 235],
  [625, 205],
  [1010, 250],
  [430, 485],
  [850, 480],
] as const;

export class StarCollectorScene extends Phaser.Scene {
  private state: StarCollectorState = createStarCollector();
  private player!: Phaser.GameObjects.Container;
  private stars: Phaser.GameObjects.Star[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private finished = false;
  constructor() {
    super('StarCollector');
  }

  create(): void {
    this.state = createStarCollector();
    this.stars = [];
    this.finished = false;
    this.cameras.main.setBackgroundColor('#dff6ff');
    this.add.rectangle(640, 365, 1100, 485, 0xf0fbdc).setStrokeStyle(7, 0x3c807d);
    this.add.text(45, 42, 'Star Collector', {
      fontFamily: 'Arial',
      fontSize: '44px',
      color: '#17324d',
      fontStyle: 'bold',
    });
    this.progressText = this.add
      .text(640, 60, 'Stars: ○ ○ ○ ○ ○', {
        fontFamily: 'Arial',
        fontSize: '31px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 1120, 58, 'Game Library', () => goToScene(this, 'GameHub'), 240);
    for (const [x, y] of STAR_POSITIONS) {
      const star = this.add.star(x, y, 5, 20, 43, 0xffd65a).setStrokeStyle(4, 0x8a5b00);
      if (!preferences.current.reducedMotion)
        this.tweens.add({ targets: star, scale: 1.12, duration: 750, yoyo: true, repeat: -1 });
      this.stars.push(star);
    }
    const body = this.add.circle(0, 0, 36, 0x5c78d4).setStrokeStyle(4, 0x17324d);
    const face = this.add
      .text(0, -2, '☺', { fontFamily: 'Arial', fontSize: '43px', color: '#ffffff' })
      .setOrigin(0.5);
    this.player = this.add.container(640, 370, [body, face]);
    this.add
      .text(640, 675, 'Use the big arrows to collect every star.', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#17324d',
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    const speed = (320 * Math.min(delta, 40)) / 1000;
    let x = Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft'));
    let y = Number(actions.isHeld('moveDown')) - Number(actions.isHeld('moveUp'));
    if (x && y) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    this.player.x = Phaser.Math.Clamp(
      this.player.x + x * speed,
      PLAY_BOUNDS.left + 40,
      PLAY_BOUNDS.right - 40,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + y * speed,
      PLAY_BOUNDS.top + 40,
      PLAY_BOUNDS.bottom - 40,
    );
    for (const star of this.stars)
      if (
        star.visible &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, star.x, star.y) < 72
      )
        this.collect(star);
    if (actions.wasPressed('cancel')) goToScene(this, 'GameHub');
  }

  private collect(star: Phaser.GameObjects.Star): void {
    star.setVisible(false);
    this.state = collectStar(this.state);
    this.progressText.setText(
      `Stars: ${'★'.repeat(this.state.collected)}${'○'.repeat(this.state.total - this.state.collected)}`,
    );
    if (this.state.complete) this.showSuccess();
  }

  private showSuccess(): void {
    this.finished = true;
    this.add.rectangle(0, 0, 1280, 720, 0x17324d, 0.82).setOrigin(0).setDepth(20);
    this.add.rectangle(640, 355, 720, 430, 0xfff8e7).setStrokeStyle(7, 0xffd65a).setDepth(21);
    this.add
      .text(640, 245, 'You found all five stars!', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(22);
    this.add
      .text(640, 315, 'Wonderful exploring!', {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#46627a',
      })
      .setOrigin(0.5)
      .setDepth(22);
    addButton(this, 505, 440, 'Play Again', () => this.scene.restart(), 260).setDepth(22);
    addButton(this, 795, 440, 'Game Library', () => goToScene(this, 'GameHub'), 260).setDepth(22);
  }
}
