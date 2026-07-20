import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { actions, preferences } from '../core/services';
import {
  createPlanetFactMatch,
  dropPlanetForFact,
  PLANET_IDS,
  type PlanetFactMatchState,
  type PlanetId,
} from '../games/planet-fact-match/rules';
import { addButton } from '../ui/button';
import { enableDragPlacement } from '../ui/DragPlacement';
import { enableTapSelection } from '../ui/TapSelection';

const SLOT = { x: 640, y: 365, radius: 82 } as const;
const PLANET_NAMES: Readonly<Record<PlanetId, string>> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

interface PlanetChoice {
  id: PlanetId;
  display: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  startX: number;
  startY: number;
  cleanupDrag: () => void;
  matched: boolean;
}

export class PlanetFactMatchScene extends Phaser.Scene {
  private match: PlanetFactMatchState = createPlanetFactMatch();
  private planets: PlanetChoice[] = [];
  private factText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private starText!: Phaser.GameObjects.Text;
  private cleanupFactTap: (() => void) | undefined;
  private locked = false;

  constructor() {
    super('PlanetFactMatch');
  }

  create(): void {
    this.match = createPlanetFactMatch();
    this.planets = [];
    this.locked = false;
    this.cameras.main.setBackgroundColor('#10243d');
    this.add.text(25, 18, 'Planet Fact Match', {
      fontFamily: 'Arial',
      fontSize: '39px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(
      25,
      63,
      'Drag the matching planet into the slot. Tap the fact to hear it again.',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#d7e8ff',
      },
    );
    this.starText = this.add
      .text(720, 46, '', {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 1135, 48, 'Game Library', () => this.scene.start('GameHub'), 240);

    PLANET_IDS.forEach((id, index) => {
      const x = 75 + index * 160;
      const y = 150;
      const display = this.createPlanet(id, x, y).setDepth(10);
      const label = this.add
        .text(x, 215, PLANET_NAMES[id], {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const cleanupDrag = enableDragPlacement(this, display, {
        onSelect: () => display.setDepth(25),
        onDrop: (dropX, dropY) => this.dropPlanet(id, dropX, dropY),
      });
      this.planets.push({ id, display, label, startX: x, startY: y, cleanupDrag, matched: false });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const planet of this.planets) planet.cleanupDrag();
      this.cleanupFactTap?.();
      stopSpeaking();
    });

    this.add.rectangle(640, 470, 1040, 410, 0xfffbec).setStrokeStyle(8, 0x7fa5c7);
    this.add.circle(SLOT.x, SLOT.y, SLOT.radius, 0xe7f0f4).setStrokeStyle(8, 0x17324d).setDepth(2);
    this.add
      .text(SLOT.x, SLOT.y, 'PLANET\nSLOT', {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#46627a',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    this.factText = this.add
      .text(640, 510, this.match.current?.text ?? '', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#17324d',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 850 },
      })
      .setFixedSize(850, 100)
      .setOrigin(0.5);
    this.cleanupFactTap = enableTapSelection(this, this.factText, () => {
      const fact = this.match.current?.text;
      if (fact) speak(fact, preferences.current.muted);
    });
    this.feedbackText = this.add
      .text(640, 610, 'Which planet matches this fact?', {
        fontFamily: 'Arial',
        fontSize: '23px',
        color: '#365c70',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 850 },
      })
      .setOrigin(0.5);
    this.refreshRound();
  }

  update(): void {
    if (actions.wasPressed('cancel')) this.scene.start('GameHub');
  }

  private dropPlanet(id: PlanetId, x: number, y: number): void {
    const planet = this.planets.find((choice) => choice.id === id);
    if (!planet) return;
    if (this.locked || planet.matched) {
      planet.display.setPosition(planet.startX, planet.startY).setDepth(10);
      return;
    }
    const insideSlot = Phaser.Math.Distance.Between(x, y, SLOT.x, SLOT.y) <= SLOT.radius + 45;
    if (!insideSlot) {
      planet.display.setPosition(planet.startX, planet.startY).setDepth(10);
      this.feedbackText.setText('Bring a planet into the round slot.');
      return;
    }

    const result = dropPlanetForFact(this.match, id);
    if (!result.correct) {
      planet.display.setPosition(planet.startX, planet.startY).setDepth(10);
      this.feedbackText.setText(`Not that planet yet. Hint: ${result.hint}`);
      return;
    }

    this.match = result.state;
    this.locked = true;
    planet.matched = true;
    planet.cleanupDrag();
    planet.display.setPosition(SLOT.x, SLOT.y).setDepth(15);
    planet.label.setText(`★ ${PLANET_NAMES[id]}`).setColor('#fff4c2');
    this.feedbackText.setText('That matches! You earned a star.');
    playPlacementTone(preferences.current.muted);
    speak(PLANET_NAMES[id], preferences.current.muted);
    this.refreshStars();
    if (!preferences.current.reducedMotion)
      this.tweens.add({ targets: planet.display, scale: 1.18, duration: 180, yoyo: true });

    this.time.delayedCall(1500, () => {
      planet.display.setPosition(planet.startX, planet.startY).setDepth(10);
      this.locked = false;
      if (this.match.complete) this.completeGame();
      else this.refreshRound();
    });
  }

  private refreshRound(): void {
    const fact = this.match.current?.text;
    this.factText.setText(fact ?? 'All planets matched!');
    this.feedbackText.setText('Which planet matches this fact?');
    this.refreshStars();
    if (fact) speak(fact, preferences.current.muted);
  }

  private refreshStars(): void {
    this.starText.setText(
      `Stars: ${'★'.repeat(this.match.stars)}${'○'.repeat(8 - this.match.stars)}`,
    );
  }

  private completeGame(): void {
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.88).setOrigin(0);
    const panel = this.add.rectangle(640, 350, 760, 430, 0xfffbec).setStrokeStyle(8, 0xffd65a);
    const title = this.add
      .text(640, 245, 'Eight stars! You matched every planet!', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#17324d',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5);
    const replay = addButton(this, 500, 440, 'Play Again', () => this.scene.restart(), 250);
    const library = addButton(
      this,
      790,
      440,
      'Game Library',
      () => this.scene.start('GameHub'),
      250,
    );
    this.add.container(0, 0, [shade, panel, title, replay, library]).setDepth(100);
  }

  private createPlanet(id: PlanetId, x: number, y: number): Phaser.GameObjects.Container {
    const colors: Readonly<Record<PlanetId, number>> = {
      mercury: 0xa9a49d,
      venus: 0xe2ad65,
      earth: 0x4e91d8,
      mars: 0xc96848,
      jupiter: 0xd6ae82,
      saturn: 0xe4cf8c,
      uranus: 0x8bd4d5,
      neptune: 0x4168c7,
    };
    const radii: Readonly<Record<PlanetId, number>> = {
      mercury: 25,
      venus: 31,
      earth: 32,
      mars: 28,
      jupiter: 43,
      saturn: 37,
      uranus: 34,
      neptune: 34,
    };
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (id === 'saturn')
      parts.push(this.add.ellipse(0, 0, 104, 30).setStrokeStyle(9, 0xf2e1a9).setFillStyle(0, 0));
    const body = this.add.circle(0, 0, radii[id], colors[id]).setStrokeStyle(4, 0xffffff);
    parts.push(body);
    if (id === 'earth') parts.push(this.add.ellipse(-8, -3, 25, 14, 0x65b96f));
    if (id === 'jupiter') {
      parts.push(this.add.rectangle(0, -12, 70, 8, 0xf2d1aa));
      parts.push(this.add.rectangle(0, 14, 74, 7, 0xad745d));
    }
    if (id === 'mars') parts.push(this.add.circle(-9, -7, 7, 0x9d493c));
    if (id === 'venus') parts.push(this.add.ellipse(4, -5, 45, 10, 0xf4d38f, 0.75));
    return this.add.container(x, y, parts).setSize(120, 110);
  }
}
