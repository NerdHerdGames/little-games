import Phaser from 'phaser';
import { actions, progress } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { addButton } from '../ui/button';
import { addHoldButton } from '../ui/holdButton';

export class ParentInfoScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  constructor() {
    super('ParentInfo');
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#f8f4e9');
    this.add
      .text(640, 70, 'Information for Grown-ups', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(
        640,
        245,
        [
          '• Progress is stored only on this device.',
          '• There are no accounts or advertisements.',
          '• There is no analytics tracking.',
          '• The game makes no gameplay network requests.',
          '• Progress can be reset locally below.',
        ].join('\n'),
        { fontFamily: 'Arial', fontSize: '29px', color: '#17324d', lineSpacing: 15 },
      )
      .setOrigin(0.5);
    this.status = this.add
      .text(640, 430, 'Hold the reset button for 2 seconds to prevent accidents.', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#6a4040',
      })
      .setOrigin(0.5);
    addHoldButton(this, 640, 510, 'Hold to Reset All Badge Progress', 2000, () => {
      progress.reset();
      this.status.setText('Progress was reset on this device.');
    });
    addButton(this, 640, 625, 'Back to Settings', () => goToScene(this, 'Settings'), 360);
  }
  update(): void {
    if (actions.wasPressed('cancel')) goToScene(this, 'Settings');
  }
}
