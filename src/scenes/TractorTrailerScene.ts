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

const TRAILER_X = [520, 315, 110] as const;
const TRAILER_Y = 500;
const TRACTOR_BODY_KEY = 'tractor-body';
const REAR_WHEELS_KEY = 'tractor-rear-wheels';
const FRONT_WHEELS_KEY = 'tractor-front-wheels';
const TRAILER_BODY_KEY = 'trailer-body';
const TRAILER_WHEELS_KEY = 'trailer-wheels';
const FARM_ANIMALS_KEY = 'farm-animals';
const ACE_DOG_KEY = 'ace-dog';
const OLIVER_CAT_KEY = 'oliver-cat';
const BACKGROUND_KEY = 'tractor-background';
const BARN_KEY = 'tractor-barn';
const REAR_WHEEL_FRAMES = [
  [22, 240, 240, 250],
  [292, 240, 240, 250],
  [562, 240, 240, 250],
  [831, 240, 241, 250],
  [1102, 240, 240, 250],
  [1373, 240, 239, 250],
  [1642, 240, 240, 250],
  [1912, 240, 240, 250],
] as const;
const FRONT_WHEEL_FRAMES = [
  [65, 261, 207, 212],
  [328, 261, 209, 212],
  [593, 261, 207, 212],
  [855, 261, 206, 212],
  [1114, 261, 206, 212],
  [1372, 261, 206, 212],
  [1632, 261, 206, 212],
  [1893, 261, 206, 212],
] as const;
const TRAILER_WHEEL_FRAMES = [
  [58, 260, 218, 220],
  [322, 260, 218, 220],
  [582, 260, 219, 220],
  [847, 260, 217, 220],
  [1108, 260, 219, 220],
  [1372, 260, 216, 220],
  [1631, 260, 218, 220],
  [1895, 260, 215, 220],
] as const;
const FARM_ANIMAL_FRAMES = [
  { id: 'cow', x: 41, y: 380, width: 376, height: 253 },
  { id: 'chicken', x: 457, y: 442, width: 153, height: 191 },
  { id: 'pig', x: 668, y: 453, width: 285, height: 180 },
  { id: 'sheep', x: 998, y: 430, width: 253, height: 203 },
  { id: 'horse', x: 1295, y: 324, width: 338, height: 309 },
] as const;
const SPECIAL_ANIMAL_FRAMES = [
  { id: 'dog', textureKey: ACE_DOG_KEY, x: 210, y: 212, width: 770, height: 802 },
  { id: 'cat', textureKey: OLIVER_CAT_KEY, x: 232, y: 22, width: 816, height: 1162 },
] as const;

export class TractorTrailerScene extends Phaser.Scene {
  private journey: TractorGameState = createTractorGame();
  private feedbackText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private scenery: Phaser.GameObjects.Rectangle[] = [];
  private animalDisplay: Phaser.GameObjects.Container | undefined;
  private cleanupAnimalDrag: (() => void) | undefined;
  private rearWheel!: Phaser.GameObjects.Sprite;
  private frontWheel!: Phaser.GameObjects.Sprite;
  private trailerWheels: Phaser.GameObjects.Sprite[] = [];
  private barn!: Phaser.GameObjects.Container;
  private wheelsMoving = false;

  constructor() {
    super('TractorTrailer');
  }

  preload(): void {
    const path = 'assets/games/tractor-trailer/';
    this.load.image(TRACTOR_BODY_KEY, `${path}BoyFarmerOnTractorBodySprite.png`);
    this.load.image(REAR_WHEELS_KEY, `${path}TractoRear WheelAnimation.png`);
    this.load.image(FRONT_WHEELS_KEY, `${path}TractorFrontWheelsAnimation.png`);
    this.load.image(TRAILER_BODY_KEY, `${path}TrailerBodySprite.png`);
    this.load.image(TRAILER_WHEELS_KEY, `${path}TrailerWheelAnimation.png`);
    this.load.image(FARM_ANIMALS_KEY, `${path}FarmAnimalsSprite.png`);
    this.load.image(ACE_DOG_KEY, `${path}AceOnTheFarm.png`);
    this.load.image(OLIVER_CAT_KEY, `${path}OliverOnTheFarm.png`);
    this.load.image(BACKGROUND_KEY, `${path}Background1.png`);
    this.load.image(BARN_KEY, `${path}Barn.png`);
  }

  create(): void {
    this.journey = createTractorGame();
    this.scenery = [];
    this.animalDisplay = undefined;
    this.cleanupAnimalDrag = undefined;
    this.trailerWheels = [];
    this.wheelsMoving = false;
    this.cameras.main.setBackgroundColor('#a9ddf5');

    this.add.image(640, 360, BACKGROUND_KEY).setDisplaySize(1280, 720).setDepth(-10);
    for (let index = 0; index < 9; index += 1) {
      const post = this.add.rectangle(45 + index * 165, 540, 12, 85, 0xf4e0a4);
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
    this.createBarn();
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
    const rightHeld = actions.isHeld('moveRight');
    const goHeld = actions.isHeld('primaryAction');
    const driving =
      !this.journey.complete && !this.journey.waitingForAnimal && (rightHeld || goHeld);
    this.setWheelsMoving(driving);
    if (!driving) return;

    const traveled = (Math.min(delta, 40) * 115) / 1000;
    const previous = this.journey;
    this.journey = driveTractor(previous, traveled, rightHeld, goHeld);
    this.scrollScenery(traveled);
    this.scrollBarn(traveled);
    if (!previous.complete && this.journey.complete) {
      this.setWheelsMoving(false);
      this.feedbackText.setText('You made it to the barn!');
      speak('You made it to the barn!', preferences.current.muted);
      this.completeGame();
      return;
    }
    if (!previous.waitingForAnimal && this.journey.waitingForAnimal) {
      this.setWheelsMoving(false);
      this.showNextAnimal();
    }
  }

  private createVehicle(): void {
    this.registerWheelFrames(TRAILER_WHEELS_KEY, TRAILER_WHEEL_FRAMES);
    const animalTexture = this.textures.get(FARM_ANIMALS_KEY);
    for (const frame of FARM_ANIMAL_FRAMES) {
      if (!animalTexture.has(frame.id))
        animalTexture.add(frame.id, 0, frame.x, frame.y, frame.width, frame.height);
    }
    for (const frame of SPECIAL_ANIMAL_FRAMES) {
      const texture = this.textures.get(frame.textureKey);
      if (!texture.has(frame.id))
        texture.add(frame.id, 0, frame.x, frame.y, frame.width, frame.height);
    }
    if (this.anims.exists('trailer-wheel-turn')) this.anims.remove('trailer-wheel-turn');
    this.anims.create({
      key: 'trailer-wheel-turn',
      frames: TRAILER_WHEEL_FRAMES.map((_frame, index) => ({
        key: TRAILER_WHEELS_KEY,
        frame: `wheel-${index}`,
      })),
      frameRate: preferences.current.reducedMotion ? 4 : 10,
      repeat: -1,
    });
    for (let index = 2; index >= 0; index -= 1) {
      const x = TRAILER_X[index]!;
      this.add.image(x, 550, TRAILER_BODY_KEY).setDisplaySize(225, 169).setDepth(1);
      const rearWheel = this.add
        .sprite(x - 50, 582, TRAILER_WHEELS_KEY, 'wheel-0')
        .setDisplaySize(50, 50)
        .setDepth(2);
      const frontWheel = this.add
        .sprite(x + 50, 582, TRAILER_WHEELS_KEY, 'wheel-0')
        .setDisplaySize(50, 50)
        .setDepth(2);
      this.trailerWheels.push(rearWheel, frontWheel);
      this.add
        .text(x, 540, `Trailer ${index + 1}`, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#17324d',
          fontStyle: 'bold',
          backgroundColor: '#fff8e7',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(5);
    }
    this.registerWheelFrames(REAR_WHEELS_KEY, REAR_WHEEL_FRAMES);
    this.registerWheelFrames(FRONT_WHEELS_KEY, FRONT_WHEEL_FRAMES);
    const frameRate = preferences.current.reducedMotion ? 4 : 10;
    if (this.anims.exists('tractor-rear-wheel-turn')) this.anims.remove('tractor-rear-wheel-turn');
    this.anims.create({
      key: 'tractor-rear-wheel-turn',
      frames: REAR_WHEEL_FRAMES.map((_frame, index) => ({
        key: REAR_WHEELS_KEY,
        frame: `wheel-${index}`,
      })),
      frameRate,
      repeat: -1,
    });
    if (this.anims.exists('tractor-front-wheel-turn'))
      this.anims.remove('tractor-front-wheel-turn');
    this.anims.create({
      key: 'tractor-front-wheel-turn',
      frames: FRONT_WHEEL_FRAMES.map((_frame, index) => ({
        key: FRONT_WHEELS_KEY,
        frame: `wheel-${index}`,
      })),
      frameRate,
      repeat: -1,
    });

    this.add.image(754, 500, TRACTOR_BODY_KEY).setDisplaySize(312, 234).setDepth(3);
    this.rearWheel = this.add
      .sprite(658, 558, REAR_WHEELS_KEY, 'wheel-0')
      .setDisplaySize(99, 99)
      .setDepth(4);
    this.frontWheel = this.add
      .sprite(851, 577, FRONT_WHEELS_KEY, 'wheel-0')
      .setDisplaySize(62, 62)
      .setDepth(4);
  }

  private createBarn(): void {
    const texture = this.textures.get(BARN_KEY);
    if (!texture.has('barn')) texture.add('barn', 0, 119, 182, 999, 826);
    const art = this.add.image(0, 0, BARN_KEY, 'barn').setDisplaySize(340, 281);
    this.barn = this.add.container(1500, 420, [art]).setDepth(2).setVisible(false);
  }

  private registerWheelFrames(
    textureKey: string,
    frames: readonly (readonly [number, number, number, number])[],
  ): void {
    const texture = this.textures.get(textureKey);
    frames.forEach(([x, y, width, height], index) => {
      const name = `wheel-${index}`;
      if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
    });
  }

  private setWheelsMoving(moving: boolean): void {
    if (moving === this.wheelsMoving) return;
    this.wheelsMoving = moving;
    if (moving) {
      this.rearWheel.play('tractor-rear-wheel-turn');
      this.frontWheel.play('tractor-front-wheel-turn');
      for (const wheel of this.trailerWheels) wheel.play('trailer-wheel-turn');
    } else {
      this.rearWheel.stop();
      this.frontWheel.stop();
      for (const wheel of this.trailerWheels) wheel.stop();
    }
  }

  private showNextAnimal(): void {
    const animalId = this.journey.animals[this.journey.loaded.length];
    const animal = FARM_ANIMALS.find(({ id }) => id === animalId);
    if (!animal) throw new Error(`Missing farm animal display data for ${String(animalId)}.`);

    const farmFrame = FARM_ANIMAL_FRAMES.find(({ id }) => id === animal.id);
    const specialFrame = SPECIAL_ANIMAL_FRAMES.find(({ id }) => id === animal.id);
    const frame = farmFrame ?? specialFrame;
    const animalScale = frame ? Math.min(150 / frame.width, 125 / frame.height) : 1;
    const animalArt = frame
      ? this.add
          .image(0, 0, specialFrame?.textureKey ?? FARM_ANIMALS_KEY, frame.id)
          .setDisplaySize(frame.width * animalScale, frame.height * animalScale)
      : this.add.rectangle(0, 0, 105, 105, animal.color).setStrokeStyle(7, 0x17324d);
    const placeholder = frame
      ? undefined
      : this.add
          .text(0, -4, animal.name.toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: '27px',
            color: '#17324d',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
    const label = this.add
      .text(0, 88, animal.name, {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#17324d',
        fontStyle: 'bold',
        backgroundColor: '#fff8e7',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5);
    const display = this.add
      .container(1000, 425, placeholder ? [animalArt, placeholder, label] : [animalArt, label])
      .setSize(180, 180)
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
      ?.setPosition(targetX, TRAILER_Y - 10)
      .setScale(0.75)
      .setDepth(0);
    this.animalDisplay = undefined;
    const animal = FARM_ANIMALS.find(({ id }) => id === animalId);
    const message = `${animal?.name ?? 'Animal'} is safely aboard!`;
    this.feedbackText.setText(message);
    this.progressText.setText(`Animals aboard: ${this.journey.loaded.length} of 3`);
    playPlacementTone(preferences.current.muted);
    speak(message, preferences.current.muted);
    if (this.journey.loaded.length === this.journey.animals.length) {
      this.barn.setVisible(true);
      this.feedbackText.setText('All three animals are aboard! Keep driving to the barn.');
      speak('All three animals are aboard. Keep driving to the barn.', preferences.current.muted);
    } else {
      this.time.delayedCall(900, () =>
        this.feedbackText.setText('Hold Right or Go to keep driving!'),
      );
    }
  }

  private scrollScenery(distance: number): void {
    for (const post of this.scenery) {
      post.x -= distance * 1.4;
      if (post.x < -20) post.x += 1485;
    }
  }

  private scrollBarn(distance: number): void {
    if (this.barn.visible) this.barn.x = Math.max(1060, this.barn.x - distance * 1.2);
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
