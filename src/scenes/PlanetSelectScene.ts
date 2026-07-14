import Phaser from 'phaser';
import { PLANETS } from '../data/planets';
import { actions, progress } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { MenuFocus } from '../ui/MenuFocus';
import { addButton } from '../ui/button';

export class PlanetSelectScene extends Phaser.Scene {
  private focus = new MenuFocus(PLANETS.length);
  private cards: Phaser.GameObjects.Container[] = [];
  private status!: Phaser.GameObjects.Text;
  constructor() {
    super('PlanetSelect');
  }

  create(): void {
    this.cards = [];
    this.cameras.main.setBackgroundColor('#12243a');
    this.add
      .text(640, 50, 'Choose a Dwarf Planet', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '46px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 92, 'Sizes and distances are shown just for fun — not to scale.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        color: '#c7d9ed',
      })
      .setOrigin(0.5);
    if (progress.areAllUnlocked())
      this.add
        .text(640, 122, '★ All five worlds explored — complete badge collection! ★', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#fff4c2',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    PLANETS.forEach((planet, index) => {
      const x = 160 + index * 240;
      const panel = this.add.rectangle(0, 0, 210, 330, 0x203c5a).setStrokeStyle(5, 0x7193b5);
      const world = this.add
        .circle(0, -65, planet.id === 'haumea' ? 42 : 58, planet.color)
        .setStrokeStyle(4, 0xffffff);
      if (planet.id === 'haumea') world.setScale(1.45, 0.82);
      const name = this.add
        .text(0, 20, planet.name, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '30px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const subtitle = this.add
        .text(0, 63, planet.subtitle, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#d7e8ff',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5);
      const availability = this.add
        .text(0, 118, planet.playable ? 'Ready to explore!' : '🔒 Coming Soon', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '19px',
          color: planet.playable ? '#fff4c2' : '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const card = this.add
        .container(x, 330, [panel, world, name, subtitle, availability])
        .setSize(210, 330)
        .setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        this.focus.set(index);
        this.refresh();
      });
      card.on('pointerup', () => this.activate());
      this.cards.push(card);
    });
    this.status = this.add
      .text(640, 555, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '27px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 170, 655, 'Back', () => goToScene(this, 'MainMenu'), 230);
    addButton(this, 640, 655, 'Explore', () => this.activate(), 300);
    this.refresh();
  }

  update(): void {
    if (actions.wasPressed('moveRight')) {
      this.focus.next();
      this.refresh();
    }
    if (actions.wasPressed('moveLeft')) {
      this.focus.previous();
      this.refresh();
    }
    if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction')) this.activate();
    if (actions.wasPressed('cancel')) goToScene(this, 'MainMenu');
  }

  private activate(): void {
    const planet = PLANETS[this.focus.current];
    if (planet?.playable && planet.missionScene) goToScene(this, planet.missionScene);
    else
      this.status.setText(
        `${planet?.name ?? 'This world'} is coming soon. You can visit Ceres or Pluto today!`,
      );
  }

  private refresh(): void {
    this.cards.forEach((card, index) => card.setScale(index === this.focus.current ? 1.06 : 1));
    const planet = PLANETS[this.focus.current];
    this.status.setText(
      `${planet?.name ?? 'Ceres'} selected${planet?.playable ? ' — ready!' : ' — Coming Soon'}`,
    );
  }
}
