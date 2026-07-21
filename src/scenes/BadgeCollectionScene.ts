import Phaser from 'phaser';
import { PLANETS } from '../data/planets';
import { actions, progress } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { addButton } from '../ui/button';
import { createPlanetArt, preloadPlanetArt } from '../ui/PlanetArt';

export class BadgeCollectionScene extends Phaser.Scene {
  private destination = 'MainMenu';
  constructor() {
    super('BadgeCollection');
  }
  preload(): void {
    preloadPlanetArt(
      this,
      PLANETS.map(({ id }) => id),
    );
  }
  create(data: { fromMission?: boolean }): void {
    this.destination = data.fromMission ? 'PlanetSelect' : 'MainMenu';
    const allUnlocked = progress.areAllUnlocked();
    if (allUnlocked) this.destination = 'FreeExplore';
    this.cameras.main.setBackgroundColor('#10273d');
    this.add
      .text(640, 65, 'Badge Collection', {
        fontFamily: 'Arial',
        fontSize: '52px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(
        640,
        120,
        allUnlocked
          ? 'Complete collection — you explored every little world!'
          : data.fromMission
            ? 'A new badge unlocked! Great exploring!'
            : 'Each mission can unlock one planet badge.',
        { fontFamily: 'Arial', fontSize: '25px', color: '#d7e8ff' },
      )
      .setOrigin(0.5);
    PLANETS.forEach((planet, index) => {
      const unlocked = progress.isUnlocked(planet.id);
      const x = 160 + index * 240;
      if (unlocked) createPlanetArt(this, planet.id, x, 330, { maxWidth: 155, maxHeight: 155 });
      else this.add.circle(x, 330, 82, 0x445566).setStrokeStyle(7, 0x9da8b3);
      this.add
        .text(x, 325, unlocked ? '★' : '🔒', {
          fontFamily: 'Arial',
          fontSize: '55px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this.add
        .text(x, 440, planet.name, {
          fontFamily: 'Arial',
          fontSize: '27px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.add
        .text(x, 478, unlocked ? 'Unlocked' : 'Locked', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: unlocked ? '#fff4c2' : '#d7e8ff',
        })
        .setOrigin(0.5);
    });
    addButton(
      this,
      640,
      625,
      allUnlocked ? 'Free Explore' : data.fromMission ? 'Choose Another Planet' : 'Back',
      () => goToScene(this, allUnlocked ? 'FreeExplore' : this.destination),
      430,
    );
  }
  update(): void {
    if (actions.wasPressed('confirm') || actions.wasPressed('cancel'))
      goToScene(this, this.destination);
  }
}
