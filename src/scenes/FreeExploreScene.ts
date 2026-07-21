import Phaser from 'phaser';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { actions, preferences } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { FACTS_BY_PLANET, PLANETS } from '../data/planets';
import { MenuFocus } from '../ui/MenuFocus';
import { addButton } from '../ui/button';
import { createPlanetArt, preloadPlanetArt } from '../ui/PlanetArt';

export class FreeExploreScene extends Phaser.Scene {
  private focus = new MenuFocus(PLANETS.length);
  private factIndex = 0;
  private illustration!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;
  private fact!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;
  private cards: Phaser.GameObjects.Container[] = [];
  constructor() {
    super('FreeExplore');
  }

  preload(): void {
    preloadPlanetArt(
      this,
      PLANETS.map(({ id }) => id),
    );
  }

  create(): void {
    this.factIndex = 0;
    this.cards = [];
    this.cameras.main.setBackgroundColor('#f3f7fb');
    this.add
      .text(640, 48, 'Free Explore', {
        fontFamily: 'Arial',
        fontSize: '45px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    PLANETS.forEach((planet, index) => {
      const x = 145 + index * 245;
      const panel = this.add.rectangle(0, 0, 215, 76, 0xdbeaf4).setStrokeStyle(4, 0x527694);
      const label = this.add
        .text(0, 0, planet.name, {
          fontFamily: 'Arial',
          fontSize: '25px',
          color: '#17324d',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const card = this.add
        .container(x, 120, [panel, label])
        .setSize(215, 76)
        .setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        this.focus.set(index);
        this.factIndex = 0;
        this.refresh();
      });
      this.cards.push(card);
    });
    this.illustration = createPlanetArt(this, this.planet().id, 260, 355, {
      maxWidth: 255,
      maxHeight: 240,
    });
    this.title = this.add
      .text(260, 520, '', {
        fontFamily: 'Arial',
        fontSize: '35px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.fact = this.add
      .text(780, 330, '', {
        fontFamily: 'Arial',
        fontSize: '35px',
        color: '#17324d',
        align: 'center',
        wordWrap: { width: 620 },
        lineSpacing: 10,
      })
      .setOrigin(0.5);
    this.counter = this.add
      .text(780, 450, '', { fontFamily: 'Arial', fontSize: '21px', color: '#52708b' })
      .setOrigin(0.5);
    addButton(this, 525, 555, 'Previous Fact', () => this.previousFact(), 260);
    addButton(this, 810, 555, 'Next Fact', () => this.nextFact(), 250);
    addButton(this, 1080, 555, 'Replay Mission', () => this.replay(), 280);
    addButton(
      this,
      500,
      655,
      'Hear Name',
      () => speak(this.planet().name, preferences.current.muted),
      250,
    );
    addButton(this, 820, 655, 'Main Menu', () => goToScene(this, 'MainMenu'), 250);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stopSpeaking);
    this.refresh();
  }

  update(): void {
    if (actions.wasPressed('moveRight')) {
      this.focus.next();
      this.factIndex = 0;
      this.refresh();
    }
    if (actions.wasPressed('moveLeft')) {
      this.focus.previous();
      this.factIndex = 0;
      this.refresh();
    }
    if (actions.wasPressed('moveDown')) this.nextFact();
    if (actions.wasPressed('moveUp')) this.previousFact();
    if (actions.wasPressed('confirm')) this.replay();
    if (actions.wasPressed('cancel')) goToScene(this, 'MainMenu');
  }

  private planet() {
    return PLANETS[this.focus.current] ?? PLANETS[0]!;
  }
  private facts(): readonly string[] {
    return FACTS_BY_PLANET[this.planet().id];
  }
  private refresh(): void {
    stopSpeaking();
    const planet = this.planet();
    const facts = this.facts();
    this.cards.forEach((card, index) => card.setScale(index === this.focus.current ? 1.07 : 1));
    this.illustration.destroy(true);
    this.illustration = createPlanetArt(this, planet.id, 260, 355, {
      maxWidth: 255,
      maxHeight: 240,
    });
    this.title.setText(planet.name);
    this.fact.setText(facts[this.factIndex] ?? '');
    this.counter.setText(`Fact ${this.factIndex + 1} of ${facts.length}`);
  }
  private nextFact(): void {
    this.factIndex = Math.min(this.facts().length - 1, this.factIndex + 1);
    this.refresh();
  }
  private previousFact(): void {
    this.factIndex = Math.max(0, this.factIndex - 1);
    this.refresh();
  }
  private replay(): void {
    const scene = this.planet().missionScene;
    if (scene) goToScene(this, scene);
  }
}
