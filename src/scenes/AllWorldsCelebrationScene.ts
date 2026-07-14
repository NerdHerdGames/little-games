import Phaser from 'phaser';
import { actions, preferences } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { PLANETS } from '../data/planets';
import { addButton } from '../ui/button';

export class AllWorldsCelebrationScene extends Phaser.Scene {
  constructor() {
    super('AllWorldsCelebration');
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#10243d');
    this.add
      .text(640, 95, 'You explored five little worlds!', {
        fontFamily: 'Arial',
        fontSize: '52px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 155, 'Every dwarf-planet badge is unlocked.', {
        fontFamily: 'Arial',
        fontSize: '27px',
        color: '#d7e8ff',
      })
      .setOrigin(0.5);
    PLANETS.forEach((planet, index) => {
      const x = 170 + index * 235;
      const world = this.add
        .circle(x, 315, planet.id === 'haumea' ? 48 : 62, planet.color)
        .setStrokeStyle(6, 0xffffff);
      if (planet.id === 'haumea') world.setScale(1.4, 0.78);
      this.add
        .text(x, 410, planet.name, {
          fontFamily: 'Arial',
          fontSize: '25px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      if (!preferences.current.reducedMotion)
        this.tweens.add({
          targets: world,
          y: 305,
          duration: 1100 + index * 90,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
    });
    addButton(this, 285, 570, 'Badge Collection', () => goToScene(this, 'BadgeCollection'), 330);
    addButton(this, 640, 570, 'Play Again', () => goToScene(this, 'PlanetSelect'), 280);
    addButton(this, 1000, 570, 'Free Explore', () => goToScene(this, 'FreeExplore'), 300);
  }
  update(): void {
    if (actions.wasPressed('confirm')) goToScene(this, 'FreeExplore');
  }
}
