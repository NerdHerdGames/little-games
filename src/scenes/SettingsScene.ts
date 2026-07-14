import Phaser from 'phaser';
import { actions, preferences } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { addButton } from '../ui/button';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#e8f4ee');
    this.add
      .text(640, 100, 'Settings', {
        fontFamily: 'Arial',
        fontSize: '58px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 165, 'Your choices are saved on this device.', {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#35556f',
      })
      .setOrigin(0.5);
    addButton(
      this,
      640,
      260,
      preferences.current.muted ? 'Sound: Muted' : 'Sound: On',
      () => {
        preferences.toggleMute();
        this.scene.restart();
      },
      440,
    );
    addButton(
      this,
      640,
      365,
      preferences.current.reducedMotion ? 'Motion: Reduced' : 'Motion: Gentle',
      () => {
        preferences.toggleReducedMotion();
        this.scene.restart();
      },
      440,
    );
    addButton(
      this,
      640,
      470,
      'Information for Grown-ups',
      () => goToScene(this, 'ParentInfo'),
      440,
    );
    addButton(this, 640, 585, 'Back to Main Menu', () => goToScene(this, 'MainMenu'), 440);
    this.add
      .text(640, 675, 'No accounts, ads, tracking, or purchases.', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#35556f',
      })
      .setOrigin(0.5);
  }
  update(): void {
    if (actions.wasPressed('cancel')) goToScene(this, 'MainMenu');
  }
}
