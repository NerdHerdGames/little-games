import Phaser from 'phaser';
import { GAMES } from '../games/registry';
import { actions, preferences } from '../core/services';
import { addButton } from '../ui/button';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#fff8e7');
    this.add
      .text(640, 100, 'Little Games', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '64px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 165, 'Pick a game and have fun!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color: '#35556f',
      })
      .setOrigin(0.5);
    const game = GAMES[0];
    if (!game) throw new Error('No games are registered. Add a game to src/games/registry.ts.');
    this.add.rectangle(640, 350, 650, 260, 0xffffff).setStrokeStyle(5, 0x2c7a7b);
    this.add.star(460, 310, 5, 35, 72, 0xffd65a).setStrokeStyle(4, 0x9a6700);
    this.add.text(560, 275, game.title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '44px',
      color: '#17324d',
      fontStyle: 'bold',
    });
    this.add.text(560, 335, game.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '25px',
      color: '#35556f',
    });
    addButton(this, 640, 445, 'Play', () => this.scene.start(game.sceneKey));
    addButton(
      this,
      380,
      625,
      preferences.current.muted ? 'Sound: Off' : 'Sound: On',
      () => {
        preferences.toggleMute();
        this.scene.restart();
      },
      270,
    );
    addButton(
      this,
      760,
      625,
      preferences.current.reducedMotion ? 'Motion: Reduced' : 'Motion: Full',
      () => {
        preferences.toggleReducedMotion();
        this.scene.restart();
      },
      330,
    );
    this.add
      .text(1200, 675, 'Touch • Keyboard • Gamepad', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#35556f',
      })
      .setOrigin(1);
  }

  update(): void {
    if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction'))
      this.scene.start(GAMES[0]?.sceneKey ?? 'StarCollector');
  }
}
