import Phaser from 'phaser';
import { actions, preferences } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { MenuFocus } from '../ui/MenuFocus';
import { addButton } from '../ui/button';

const DESTINATIONS = ['PlanetSelect', 'FreeExplore', 'BadgeCollection', 'Settings'] as const;

export class MainMenuScene extends Phaser.Scene {
  private focus = new MenuFocus(4);
  private focusText!: Phaser.GameObjects.Text;
  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d1b2a');
    for (let index = 0; index < 26; index += 1) {
      const star = this.add.circle(
        40 + ((index * 193) % 1200),
        30 + ((index * 97) % 650),
        2 + (index % 3),
        0xfff4c2,
      );
      if (!preferences.current.reducedMotion)
        this.tweens.add({
          targets: star,
          alpha: 0.35,
          duration: 900 + index * 29,
          yoyo: true,
          repeat: -1,
        });
    }
    this.add
      .text(640, 125, 'Dwarf Planet Explorer', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '64px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 190, 'Visit small worlds with your rover!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#d7e8ff',
      })
      .setOrigin(0.5);
    addButton(this, 145, 65, 'Game Library', () => goToScene(this, 'GameHub'), 240);
    addButton(this, 640, 285, 'Play', () => goToScene(this, 'PlanetSelect'), 390);
    addButton(this, 640, 380, 'Free Explore', () => goToScene(this, 'FreeExplore'), 390);
    addButton(this, 640, 475, 'Badge Collection', () => goToScene(this, 'BadgeCollection'), 390);
    addButton(this, 640, 570, 'Settings', () => goToScene(this, 'Settings'), 390);
    this.focusText = this.add
      .text(640, 665, '', { fontFamily: 'Arial, sans-serif', fontSize: '23px', color: '#fff4c2' })
      .setOrigin(0.5);
    this.refreshFocus();
  }

  update(): void {
    if (actions.wasPressed('moveDown')) {
      this.focus.next();
      this.refreshFocus();
    }
    if (actions.wasPressed('moveUp')) {
      this.focus.previous();
      this.refreshFocus();
    }
    if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction'))
      goToScene(this, DESTINATIONS[this.focus.current] ?? 'PlanetSelect');
    if (actions.wasPressed('cancel')) goToScene(this, 'GameHub');
  }

  private refreshFocus(): void {
    const labels = ['Play', 'Free Explore', 'Badge Collection', 'Settings'];
    this.focusText.setText(`Selected: ${labels[this.focus.current] ?? 'Play'} • Up/Down then Go`);
    this.focusText.setVisible(actions.lastInputMethod !== 'gamepad');
  }
}
