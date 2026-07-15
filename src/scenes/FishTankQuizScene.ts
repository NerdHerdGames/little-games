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

  create(): void {
    this.state = createFishTankState();
    this.animals = [];
    this.pending = undefined;
    this.quizPanel = undefined;
    this.completionObjects = [];
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
    this.add.rectangle(790, 385, 900, 530, 0x69c9df, 0.72).setStrokeStyle(12, 0x2f7188);
    this.add.rectangle(790, 605, 880, 70, 0xe6c98a, 0.8);
    for (let index = 0; index < 16; index += 1)
      this.add.circle(370 + ((index * 179) % 830), 145 + ((index * 97) % 410), 4, 0xffffff, 0.7);
    for (let index = 0; index < 9; index += 1) {
      const x = 380 + index * 100;
      this.add.triangle(x, 595, -15, 30, 0, -20, 15, 30, 0x3a9874, 0.8);
    }
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
      if (animal.display.x < TANK.left + 65 || animal.display.x > TANK.right - 65) {
        animal.velocityX *= -1;
        animal.display.setScale(Math.sign(animal.velocityX), 1);
      }
      if (animal.display.y < TANK.top + 55 || animal.display.y > TANK.bottom - 85)
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
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (id === 'sea-turtle') {
      parts.push(
        this.add.ellipse(0, 0, 86, 58, 0x4aa66d).setStrokeStyle(4, 0xffffff),
        this.add.circle(52, 0, 18, 0x78bd79).setStrokeStyle(3, 0xffffff),
        this.add.ellipse(-22, -34, 32, 16, 0x78bd79),
        this.add.ellipse(-22, 34, 32, 16, 0x78bd79),
      );
    } else if (id === 'jellyfish') {
      parts.push(this.add.ellipse(0, -10, 78, 64, 0xc795df, 0.9).setStrokeStyle(4, 0xffffff));
      for (const offset of [-25, 0, 25])
        parts.push(this.add.line(0, 0, offset, 15, offset - 8, 55, 0xffffff, 0.9).setLineWidth(5));
    } else if (id === 'shark') {
      parts.push(
        this.add.ellipse(0, 0, 112, 48, 0x668ca3).setStrokeStyle(4, 0xffffff),
        this.add.polygon(-28, 20, [0, 0, -48, -30, -48, 30], 0x668ca3),
        this.add.triangle(0, -35, 0, 30, 24, 30, 12, 0, 0x668ca3),
      );
    } else {
      const color = id === 'clownfish' ? 0xf28a3b : id === 'regal-blue-tang' ? 0x347ac1 : 0xd9c56f;
      parts.push(
        this.add
          .ellipse(0, 0, id === 'pufferfish' ? 78 : 100, 58, color)
          .setStrokeStyle(4, 0xffffff),
        this.add.polygon(-23, 20, [0, 0, -46, -30, -46, 30], color),
      );
      if (id === 'clownfish')
        parts.push(
          this.add.rectangle(-18, 0, 11, 56, 0xffffff),
          this.add.rectangle(20, 0, 11, 50, 0xffffff),
        );
      if (id === 'regal-blue-tang') parts.push(this.add.ellipse(8, 5, 58, 19, 0xf2d34f));
    }
    parts.push(this.add.circle(30, -8, 5, 0x172b3a));
    return this.add.container(x, y, parts).setSize(130, 100);
  }
}
