import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { actions, preferences } from '../core/services';
import {
  answerFishQuestion,
  createFishTankState,
  SEA_ANIMALS,
  type FishTankState,
  type SeaAnimalId,
} from '../games/fish-tank/rules';
import { addButton } from '../ui/button';
import { enableDragPlacement } from '../ui/DragPlacement';
import { MenuFocus } from '../ui/MenuFocus';
import { enableTapSelection } from '../ui/TapSelection';

const TANK = { left: 340, right: 1240, top: 120, bottom: 650 } as const;
const OCEAN_ANIMALS_TEXTURE = 'ocean-animals';
const FISH_TANK_BACKGROUND_TEXTURE = 'fish-tank-quiz-background';
const SWIM_FRAME_COUNT = 6;
const SWIM_FRAME_WIDTH = 362;
interface AnimalAnimationDefinition {
  texture: string;
  path: string;
  cropY: number;
  cropHeight: number;
  frameRate: number;
  sizeMultiplier: number;
}
const ANIMAL_ANIMATIONS: Record<SeaAnimalId, AnimalAnimationDefinition> = {
  clownfish: {
    texture: 'clownfish-animation-sheet',
    path: 'assets/ocean/ClownFishAnimation.png',
    cropY: 210,
    cropHeight: 250,
    frameRate: 7,
    sizeMultiplier: 1,
  },
  'regal-blue-tang': {
    texture: 'regal-blue-tang-animation-sheet',
    path: 'assets/ocean/RegalBlueTangAnimation.png',
    cropY: 210,
    cropHeight: 250,
    frameRate: 7,
    sizeMultiplier: 1,
  },
  pufferfish: {
    texture: 'pufferfish-animation-sheet',
    path: 'assets/ocean/PufferFishAnimation.png',
    cropY: 205,
    cropHeight: 280,
    frameRate: 6,
    sizeMultiplier: 1,
  },
  shark: {
    texture: 'shark-animation-sheet',
    path: 'assets/ocean/SharkAnimation.png',
    cropY: 235,
    cropHeight: 210,
    frameRate: 7,
    sizeMultiplier: 2,
  },
  'sea-turtle': {
    texture: 'sea-turtle-animation-sheet',
    path: 'assets/ocean/SeaTurtleAnimation.png',
    cropY: 220,
    cropHeight: 260,
    frameRate: 6,
    sizeMultiplier: 1,
  },
  jellyfish: {
    texture: 'jellyfish-animation-sheet',
    path: 'assets/ocean/JellyFishAnimation.png',
    cropY: 140,
    cropHeight: 390,
    frameRate: 5,
    sizeMultiplier: 1,
  },
};
const OCEAN_ANIMAL_FRAMES: Record<
  SeaAnimalId,
  { x: number; y: number; width: number; height: number }
> = {
  clownfish: { x: 45, y: 125, width: 445, height: 325 },
  'regal-blue-tang': { x: 535, y: 125, width: 430, height: 325 },
  jellyfish: { x: 1025, y: 90, width: 345, height: 430 },
  shark: { x: 20, y: 570, width: 525, height: 365 },
  'sea-turtle': { x: 550, y: 630, width: 430, height: 315 },
  pufferfish: { x: 1005, y: 575, width: 430, height: 380 },
};

interface SwimmingAnimal {
  id: SeaAnimalId;
  display: Phaser.GameObjects.Container;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  released: boolean;
  cleanupDrag: () => void;
  cleanupTap: (() => void) | undefined;
  label: Phaser.GameObjects.Text;
}

export class FishTankQuizScene extends Phaser.Scene {
  private state: FishTankState = createFishTankState();
  private animals: SwimmingAnimal[] = [];
  private pending: SwimmingAnimal | undefined;
  private quizPanel: Phaser.GameObjects.Container | undefined;
  private answerButtons: Phaser.GameObjects.Container[] = [];
  private answerFocus = new MenuFocus(3);
  private answerFocusMarker: Phaser.GameObjects.Text | undefined;
  private quizFeedback: Phaser.GameObjects.Text | undefined;
  private progressText!: Phaser.GameObjects.Text;
  private selectedNameText!: Phaser.GameObjects.Text;
  private completionObjects: Array<Phaser.GameObjects.Text | Phaser.GameObjects.Container> = [];

  constructor() {
    super('FishTankQuiz');
  }

  preload(): void {
    this.load.image(OCEAN_ANIMALS_TEXTURE, 'assets/ocean/OceanAnimals.png');
    this.load.image(FISH_TANK_BACKGROUND_TEXTURE, 'assets/ocean/FishTankQuizBackground.png');
    for (const definition of Object.values(ANIMAL_ANIMATIONS))
      this.load.image(definition.texture, definition.path);
  }

  create(): void {
    this.state = createFishTankState();
    this.animals = [];
    this.pending = undefined;
    this.quizPanel = undefined;
    this.completionObjects = [];
    this.registerAnimalFrames();
    this.registerAnimalAnimations();
    this.cameras.main.setBackgroundColor('#dff5f2');
    this.add.text(25, 20, 'Fish Tank Quiz', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#17324d',
      fontStyle: 'bold',
    });
    this.add.text(25, 70, 'Drag an animal into the tank, then answer its question!', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#365c70',
      wordWrap: { width: 290 },
    });
    addButton(this, 1120, 65, 'Game Library', () => this.returnToLibrary(), 250);
    addButton(this, 430, 65, 'Watch Tank', () => this.watchFullTank(), 200);
    this.add
      .image(790, 385, FISH_TANK_BACKGROUND_TEXTURE)
      .setDisplaySize(TANK.right - TANK.left, TANK.bottom - TANK.top)
      .setDepth(-20);
    this.add.rectangle(790, 385, 900, 530).setStrokeStyle(12, 0x175d7a).setFillStyle(0, 0);
    this.progressText = this.add
      .text(680, 92, '', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.selectedNameText = this.add
      .text(990, 92, 'Tap a swimming animal', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#365c70',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    SEA_ANIMALS.forEach((animal, index) => {
      const x = index % 2 === 0 ? 90 : 245;
      const y = 185 + Math.floor(index / 2) * 145;
      const display = this.createAnimal(animal.id, x, y).setDepth(10);
      const label = this.add
        .text(x, y + 58, animal.name, {
          fontFamily: 'Arial',
          fontSize: '17px',
          color: '#17324d',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 140 },
        })
        .setOrigin(0.5);
      const cleanupDrag = enableDragPlacement(this, display, {
        onSelect: () => display.setDepth(20),
        onDrop: (dropX, dropY) => this.dropAnimal(animal.id, dropX, dropY),
      });
      this.animals.push({
        id: animal.id,
        display,
        startX: x,
        startY: y,
        velocityX: 34 + index * 4,
        velocityY: index % 2 === 0 ? 12 : -10,
        released: false,
        cleanupDrag,
        cleanupTap: undefined,
        label,
      });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const animal of this.animals) {
        animal.cleanupDrag();
        animal.cleanupTap?.();
      }
      stopSpeaking();
    });
    this.refreshProgress();
  }

  update(_time: number, delta: number): void {
    if (this.pending) {
      if (actions.wasPressed('moveDown') || actions.wasPressed('moveRight')) {
        this.answerFocus.next();
        this.refreshAnswerFocus();
      }
      if (actions.wasPressed('moveUp') || actions.wasPressed('moveLeft')) {
        this.answerFocus.previous();
        this.refreshAnswerFocus();
      }
      if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction'))
        this.chooseAnswer(this.answerFocus.current);
      if (actions.wasPressed('cancel')) this.cancelQuestion();
      return;
    }
    if (actions.wasPressed('cancel')) this.returnToLibrary();
    this.updateSwimming(Math.min(delta, 40));
  }

  private dropAnimal(id: SeaAnimalId, x: number, y: number): void {
    const animal = this.animals.find((item) => item.id === id);
    if (!animal || animal.released || this.pending) return;
    if (x < TANK.left || x > TANK.right || y < TANK.top || y > TANK.bottom) {
      animal.display.setPosition(animal.startX, animal.startY).setDepth(10);
      return;
    }
    animal.display.setPosition(
      Phaser.Math.Clamp(x, TANK.left + 70, TANK.right - 70),
      Phaser.Math.Clamp(y, TANK.top + 60, TANK.bottom - 80),
    );
    this.openQuestion(animal);
  }

  private openQuestion(animal: SwimmingAnimal): void {
    this.pending = animal;
    this.answerFocus = new MenuFocus(3);
    const data = SEA_ANIMALS.find(({ id }) => id === animal.id);
    if (!data) throw new Error(`Question data was not found for ${animal.id}.`);
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x092638, 0.87).setOrigin(0).setInteractive();
    const panel = this.add.rectangle(640, 350, 780, 540, 0xf9fcf7).setStrokeStyle(8, 0x2f7188);
    const title = this.add
      .text(640, 145, `A question about the ${data.name}`, {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const question = this.add
      .text(640, 205, data.question, {
        fontFamily: 'Arial',
        fontSize: '31px',
        color: '#17324d',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 680 },
      })
      .setOrigin(0.5);
    this.answerButtons = data.choices.map((choice, index) =>
      addButton(this, 640, 300 + index * 92, choice, () => this.chooseAnswer(index), 590),
    );
    this.answerFocusMarker = this.add
      .text(320, 300, '▶', {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.quizFeedback = this.add
      .text(640, 585, 'Choose one answer.', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#365c70',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.quizPanel = this.add
      .container(0, 0, [
        shade,
        panel,
        title,
        question,
        ...this.answerButtons,
        this.answerFocusMarker,
        this.quizFeedback,
      ])
      .setDepth(100);
    this.refreshAnswerFocus();
  }

  private chooseAnswer(choiceIndex: number): void {
    if (!this.pending) return;
    const result = answerFishQuestion(this.state, this.pending.id, choiceIndex);
    if (!result.correct) {
      this.quizFeedback?.setText('Good try! Choose another answer.');
      return;
    }
    this.state = result.state;
    const released = this.pending;
    released.released = true;
    released.cleanupDrag();
    released.display.setDepth(5);
    this.startTankAnimation(released);
    this.enableAnimalTap(released);
    this.pending = undefined;
    this.quizPanel?.destroy();
    this.quizPanel = undefined;
    this.answerButtons = [];
    this.answerFocusMarker = undefined;
    playPlacementTone(preferences.current.muted);
    this.refreshProgress();
    if (this.state.complete) this.completeGame();
  }

  private cancelQuestion(): void {
    if (!this.pending) return;
    this.pending.display.setPosition(this.pending.startX, this.pending.startY).setDepth(10);
    this.pending = undefined;
    this.quizPanel?.destroy();
    this.quizPanel = undefined;
    this.answerButtons = [];
    this.answerFocusMarker = undefined;
  }

  private updateSwimming(delta: number): void {
    const motionScale = preferences.current.reducedMotion ? 0.25 : 1;
    for (const animal of this.animals) {
      if (!animal.released) continue;
      animal.display.x += (animal.velocityX * delta * motionScale) / 1000;
      animal.display.y += (animal.velocityY * delta * motionScale) / 1000;
      const sprite = animal.display.getAt(0);
      const horizontalPadding =
        sprite instanceof Phaser.GameObjects.Sprite ? sprite.displayWidth / 2 + 10 : 65;
      const verticalPadding =
        sprite instanceof Phaser.GameObjects.Sprite ? sprite.displayHeight / 2 + 10 : 55;
      if (
        animal.display.x < TANK.left + horizontalPadding ||
        animal.display.x > TANK.right - horizontalPadding
      ) {
        animal.velocityX *= -1;
        animal.display.setScale(Math.sign(animal.velocityX), 1);
      }
      if (
        animal.display.y < TANK.top + verticalPadding ||
        animal.display.y > TANK.bottom - Math.max(85, verticalPadding)
      )
        animal.velocityY *= -1;
    }
  }

  private refreshProgress(): void {
    this.progressText.setText(`Animals in the tank: ${this.state.released.length} of 6`);
  }

  private watchFullTank(): void {
    if (this.pending) this.cancelQuestion();
    this.completionObjects.forEach((object) => object.destroy());
    this.completionObjects = [];
    SEA_ANIMALS.forEach((data, index) => {
      const animal = this.animals.find(({ id }) => id === data.id);
      if (!animal || animal.released) return;
      animal.released = true;
      animal.cleanupDrag();
      animal.display
        .setPosition(470 + (index % 3) * 280, 230 + Math.floor(index / 3) * 230)
        .setDepth(5);
      this.startTankAnimation(animal);
      this.enableAnimalTap(animal);
      this.state = answerFishQuestion(this.state, data.id, data.correctChoice).state;
    });
    this.refreshProgress();
    this.selectedNameText.setText('Tap a swimming animal');
  }

  private enableAnimalTap(animal: SwimmingAnimal): void {
    animal.cleanupTap?.();
    animal.cleanupTap = enableTapSelection(this, animal.display, () => {
      const data = SEA_ANIMALS.find(({ id }) => id === animal.id);
      if (!data) return;
      for (const item of this.animals) item.label.setColor('#17324d').setScale(1);
      animal.label.setColor('#a43d62').setScale(1.14);
      this.selectedNameText.setText(`This is the ${data.name}`);
      speak(data.name, preferences.current.muted);
    });
  }
  private refreshAnswerFocus(): void {
    this.answerButtons.forEach((button) => button.setScale(1));
    this.answerFocusMarker?.setY(300 + this.answerFocus.current * 92);
  }

  private completeGame(): void {
    const message = this.add
      .text(790, 300, 'Your fish tank is full of ocean friends!', {
        fontFamily: 'Arial',
        fontSize: '38px',
        color: '#17324d',
        backgroundColor: '#fff4c2',
        padding: { x: 25, y: 18 },
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5)
      .setDepth(40);
    if (!preferences.current.reducedMotion)
      this.tweens.add({ targets: message, scale: 1.05, duration: 500, yoyo: true });
    const watch = addButton(
      this,
      530,
      420,
      'Watch Tank',
      () => {
        this.completionObjects.forEach((object) => object.setVisible(false));
      },
      220,
    ).setDepth(41);
    const replay = addButton(
      this,
      790,
      420,
      'Play Again',
      () => this.scene.restart(),
      220,
    ).setDepth(41);
    const library = addButton(
      this,
      1050,
      420,
      'Game Library',
      () => this.returnToLibrary(),
      220,
    ).setDepth(41);
    this.completionObjects = [message, watch, replay, library];
  }

  private returnToLibrary(): void {
    stopSpeaking();
    this.scene.start('GameHub');
  }

  private createAnimal(id: SeaAnimalId, x: number, y: number): Phaser.GameObjects.Container {
    const sprite = this.add.sprite(0, 0, OCEAN_ANIMALS_TEXTURE, id);
    const scale = Math.min(122 / sprite.width, 92 / sprite.height);
    sprite.setScale(scale);
    return this.add.container(x, y, [sprite]).setSize(140, 108);
  }

  private registerAnimalFrames(): void {
    const texture = this.textures.get(OCEAN_ANIMALS_TEXTURE);
    for (const [id, frame] of Object.entries(OCEAN_ANIMAL_FRAMES)) {
      if (!texture.has(id)) texture.add(id, 0, frame.x, frame.y, frame.width, frame.height);
    }
  }

  private registerAnimalAnimations(): void {
    for (const [id, definition] of Object.entries(ANIMAL_ANIMATIONS)) {
      const texture = this.textures.get(definition.texture);
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let index = 0; index < SWIM_FRAME_COUNT; index += 1) {
        const frameName = `swim-${index}`;
        if (!texture.has(frameName))
          texture.add(
            frameName,
            0,
            index * SWIM_FRAME_WIDTH,
            definition.cropY,
            SWIM_FRAME_WIDTH,
            definition.cropHeight,
          );
        frames.push({ key: definition.texture, frame: frameName });
      }
      const animationKey = `${id}-swim`;
      if (!this.anims.exists(animationKey))
        this.anims.create({
          key: animationKey,
          frames,
          frameRate: definition.frameRate,
          repeat: -1,
          yoyo: true,
        });
    }
  }

  private startTankAnimation(animal: SwimmingAnimal): void {
    if (preferences.current.reducedMotion) return;
    const sprite = animal.display.getAt(0);
    if (!(sprite instanceof Phaser.GameObjects.Sprite)) return;
    const definition = ANIMAL_ANIMATIONS[animal.id];
    const scale =
      Math.min(122 / SWIM_FRAME_WIDTH, 92 / definition.cropHeight) * definition.sizeMultiplier;
    sprite.setScale(scale).play(`${animal.id}-swim`);
    animal.display.setPosition(
      Phaser.Math.Clamp(
        animal.display.x,
        TANK.left + sprite.displayWidth / 2 + 10,
        TANK.right - sprite.displayWidth / 2 - 10,
      ),
      Phaser.Math.Clamp(
        animal.display.y,
        TANK.top + sprite.displayHeight / 2 + 10,
        TANK.bottom - Math.max(85, sprite.displayHeight / 2 + 10),
      ),
    );
  }
}
