import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { actions, preferences } from '../core/services';
import {
  createTractorGame,
  driveTractor,
  FARM_ANIMALS,
  loadFarmAnimal,
  type FarmAnimalId,
  type TractorGameState,
} from '../games/tractor-trailer/rules';
import { addButton } from '../ui/button';
import { enableDragPlacement } from '../ui/DragPlacement';

const TRAILER_X = [390, 245, 100] as const;
const TRAILER_Y = 500;

export class TractorTrailerScene extends Phaser.Scene {
  private journey: TractorGameState = createTractorGame();
  private feedbackText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private scenery: Phaser.GameObjects.Rectangle[] = [];
  private animalDisplay: Phaser.GameObjects.Container | undefined;
  private cleanupAnimalDrag: (() => void) | undefined;

  constructor() {
    super('TractorTrailer');
  }

  create(): void {
    this.journey = createTractorGame();
    this.scenery = [];
    this.animalDisplay = undefined;
    this.cleanupAnimalDrag = undefined;
    this.cameras.main.setBackgroundColor('#a9ddf5');

    this.add.rectangle(640, 600, 1280, 240, 0x74b85a);
    this.add.rectangle(640, 625, 1280, 92, 0xc8a66a);
    for (let index = 0; index < 9; index += 1) {
      const post = this.add.rectangle(45 + index * 165, 565, 12, 85, 0xf4e0a4);
      this.scenery.push(post);
    }
    this.add.text(25, 18, 'Tractor Trailer Trip', {
      fontFamily: 'Arial',
      fontSize: '39px',
      color: '#17324d',
      fontStyle: 'bold',
    });
    this.add.text(25, 64, 'Hold Right or Go to drive. Then drag each animal onto a trailer.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#294d68',
    });
    addButton(this, 1135, 48, 'Game Library', () => this.scene.start('GameHub'), 240);

    this.createVehicle();
    this.feedbackText = this.add
      .text(640, 130, 'Hold Right or Go to drive!', {
        fontFamily: 'Arial',
        fontSize: '29px',
        color: '#17324d',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#fff8e7',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5);
    this.progressText = this.add
      .text(640, 190, 'Animals aboard: 0 of 3', {
        fontFamily: 'Arial',
        fontSize: '23px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupAnimalDrag?.();
      stopSpeaking();
    });
  }

  update(_time: number, delta: number): void {
    if (actions.wasPressed('cancel')) this.scene.start('GameHub');
    if (this.journey.complete || this.journey.waitingForAnimal) return;
    const rightHeld = actions.isHeld('moveRight');
    const goHeld = actions.isHeld('primaryAction');
    const driving = rightHeld || goHeld;
    if (!driving) return;

    const traveled = (Math.min(delta, 40) * 115) / 1000;
    const previous = this.journey;
    this.journey = driveTractor(previous, traveled, rightHeld, goHeld);
    this.scrollScenery(traveled);
    if (!previous.waitingForAnimal && this.journey.waitingForAnimal) this.showNextAnimal();
  }

  private createVehicle(): void {
    for (let index = 2; index >= 0; index -= 1) {
      const x = TRAILER_X[index]!;
      this.add.rectangle(x, TRAILER_Y, 125, 92, 0xd9aa49).setStrokeStyle(6, 0x70451e);
      this.add.circle(x - 40, 555, 18, 0x263849);
      this.add.circle(x + 40, 555, 18, 0x263849);
      this.add
        .text(x, 500, `${index + 1}`, {
          fontFamily: 'Arial',
          fontSize: '29px',
          color: '#70451e',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    }
    this.add.rectangle(550, 490, 155, 105, 0x57a84d).setStrokeStyle(6, 0x285e35);
    this.add.rectangle(590, 425, 74, 65, 0x73c4e8).setStrokeStyle(6, 0x285e35);
    this.add.rectangle(640, 520, 70, 55, 0x57a84d).setStrokeStyle(6, 0x285e35);
    this.add.circle(515, 555, 30, 0x263849).setStrokeStyle(5, 0xffffff);
    this.add.circle(620, 555, 42, 0x263849).setStrokeStyle(6, 0xffffff);
    this.add
      .text(550, 487, 'TRACTOR', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private showNextAnimal(): void {
    const animalId = this.journey.animals[this.journey.loaded.length];
    const animal = FARM_ANIMALS.find(({ id }) => id === animalId);
    if (!animal) throw new Error(`Missing farm animal display data for ${String(animalId)}.`);

    const square = this.add.rectangle(0, 0, 105, 105, animal.color).setStrokeStyle(7, 0x17324d);
    const face = this.add
      .text(0, -4, '?', {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const label = this.add
      .text(0, 78, animal.name, {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#17324d',
        fontStyle: 'bold',
        backgroundColor: '#fff8e7',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5);
    const display = this.add
      .container(1000, 425, [square, face, label])
      .setSize(145, 165)
      .setDepth(20);
    this.animalDisplay = display;
    const home = { x: display.x, y: display.y };
    this.cleanupAnimalDrag = enableDragPlacement(this, display, {
      onSelect: () => display.setDepth(30),
      onDrop: (x, y) => this.dropAnimal(animal.id, home.x, home.y, x, y),
      onTap: () => speak(animal.name, preferences.current.muted),
    });
    const trailerNumber = this.journey.loaded.length + 1;
    this.feedbackText.setText(`You found a ${animal.name}! Drag it onto trailer ${trailerNumber}.`);
    speak(
      `You found a ${animal.name}. Drag it onto trailer ${trailerNumber}.`,
      preferences.current.muted,
    );
  }

  private dropAnimal(
    animalId: FarmAnimalId,
    homeX: number,
    homeY: number,
    x: number,
    y: number,
  ): void {
    const trailerIndex = this.journey.loaded.length;
    const targetX = TRAILER_X[trailerIndex]!;
    const inTrailer = Math.abs(x - targetX) <= 95 && Math.abs(y - TRAILER_Y) <= 90;
    if (!inTrailer) {
      this.animalDisplay?.setPosition(homeX, homeY).setDepth(20);
      this.feedbackText.setText(`Almost! Drag the animal onto trailer ${trailerIndex + 1}.`);
      return;
    }

    this.journey = loadFarmAnimal(this.journey, animalId);
    this.cleanupAnimalDrag?.();
    this.cleanupAnimalDrag = undefined;
    this.animalDisplay
      ?.setPosition(targetX, TRAILER_Y - 5)
      .setScale(0.62)
      .setDepth(5);
    this.animalDisplay = undefined;
    const animal = FARM_ANIMALS.find(({ id }) => id === animalId);
    const message = `${animal?.name ?? 'Animal'} is safely aboard!`;
    this.feedbackText.setText(message);
    this.progressText.setText(`Animals aboard: ${this.journey.loaded.length} of 3`);
    playPlacementTone(preferences.current.muted);
    speak(message, preferences.current.muted);
    if (this.journey.complete) this.completeGame();
    else
      this.time.delayedCall(900, () =>
        this.feedbackText.setText('Hold Right or Go to keep driving!'),
      );
  }

  private scrollScenery(distance: number): void {
    for (const post of this.scenery) {
      post.x -= distance * 1.4;
      if (post.x < -20) post.x += 1485;
    }
  }

  private completeGame(): void {
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x17324d, 0.9).setOrigin(0);
    const panel = this.add.rectangle(640, 350, 760, 390, 0xfffbec).setStrokeStyle(8, 0xffd65a);
    const title = this.add
      .text(640, 270, 'All three animals are aboard!', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const replay = addButton(this, 500, 430, 'Play Again', () => this.scene.restart(), 250);
    const library = addButton(
      this,
      790,
      430,
      'Game Library',
      () => this.scene.start('GameHub'),
      250,
    );
    this.add.container(0, 0, [shade, panel, title, replay, library]).setDepth(100);
  }
}
