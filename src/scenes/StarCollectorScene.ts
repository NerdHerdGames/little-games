import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAY_BOUNDS } from '../config/settings';
import { actions, preferences } from '../core/services';
import {
  collectStar,
  createStarCollectorState,
  type StarCollectorState,
} from '../games/star-collector/rules';
import { addButton } from '../ui/button';

const STAR_POSITIONS = [
  [270, 230],
  [640, 200],
  [1010, 250],
  [430, 480],
  [850, 470],
] as const;

export class StarCollectorScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private stars: Phaser.GameObjects.Star[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private state: StarCollectorState = createStarCollectorState();
  private finished = false;

  constructor() {
    super('StarCollector');
  }

  create(): void {
    this.state = createStarCollectorState();
    this.finished = false;
    this.stars = [];
    this.cameras.main.setBackgroundColor('#dff6ff');
    this.add
      .rectangle(
        640,
        365,
        PLAY_BOUNDS.right - PLAY_BOUNDS.left,
        PLAY_BOUNDS.bottom - PLAY_BOUNDS.top,
        0xf4ffe1,
      )
      .setStrokeStyle(6, 0x2c7a7b);
    this.add.text(55, 42, 'Star Collector', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '42px',
      color: '#17324d',
      fontStyle: 'bold',
    });
    this.scoreText = this.add
      .text(640, 55, 'Stars: 0 / 5', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(
      this,
      1110,
      57,
      preferences.current.muted ? 'Sound Off' : 'Sound On',
      () => {
        preferences.toggleMute();
        this.scene.restart();
      },
      230,
    );

    for (const [x, y] of STAR_POSITIONS) {
      const star = this.add.star(x, y, 5, 20, 42, 0xffd65a).setStrokeStyle(4, 0x8a5b00);
      if (!preferences.current.reducedMotion)
        this.tweens.add({ targets: star, scale: 1.12, duration: 700, yoyo: true, repeat: -1 });
      this.stars.push(star);
    }
    const body = this.add.circle(0, 0, 34, 0x496fd8).setStrokeStyle(4, 0x17324d);
    const face = this.add
      .text(0, -2, '☺', { fontFamily: 'Arial, sans-serif', fontSize: '42px', color: '#ffffff' })
      .setOrigin(0.5);
    this.player = this.add.container(640, 365, [body, face]);
    this.add
      .text(640, 670, 'Use the big buttons to collect every star!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        color: '#17324d',
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    const speed = (330 * Math.min(delta, 40)) / 1000;
    let x = Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft'));
    let y = Number(actions.isHeld('moveDown')) - Number(actions.isHeld('moveUp'));
    if (x && y) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    this.player.x = Phaser.Math.Clamp(
      this.player.x + x * speed,
      PLAY_BOUNDS.left + 38,
      PLAY_BOUNDS.right - 38,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + y * speed,
      PLAY_BOUNDS.top + 38,
      PLAY_BOUNDS.bottom - 38,
    );
    for (const star of this.stars) {
      if (
        star.visible &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, star.x, star.y) < 72
      )
        this.collect(star);
    }
    if (actions.wasPressed('cancel')) this.scene.start('Menu');
  }

  private collect(star: Phaser.GameObjects.Star): void {
    star.setVisible(false);
    this.state = collectStar(this.state);
    this.scoreText.setText(`Stars: ${this.state.collected} / ${this.state.total}`);
    if (this.state.complete) this.showSuccess();
  }

  private showSuccess(): void {
    this.finished = true;
    const shade = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x17324d,
      0.78,
    );
    const panel = this.add.rectangle(640, 350, 700, 440, 0xfff8e7).setStrokeStyle(6, 0xffd65a);
    const title = this.add
      .text(640, 240, 'You found every star!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '52px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const message = this.add
      .text(640, 310, 'Wonderful exploring! ★★★★★', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#35556f',
      })
      .setOrigin(0.5);
    shade.setDepth(10);
    panel.setDepth(11);
    title.setDepth(12);
    message.setDepth(12);
    addButton(this, 500, 430, 'Play Again', () => this.scene.restart(), 260).setDepth(12);
    addButton(this, 790, 430, 'Games', () => this.scene.start('Menu'), 230).setDepth(12);
  }
}
