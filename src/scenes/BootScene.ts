import Phaser from 'phaser';
import { goToScene } from '../core/SceneTransitions';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#0d1b2a');
    this.add
      .text(640, 320, 'Little Games', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '52px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 390, 'Loading your games…', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#d7e8ff',
      })
      .setOrigin(0.5);
    this.time.delayedCall(100, () => goToScene(this, 'GameHub'));
  }
}
