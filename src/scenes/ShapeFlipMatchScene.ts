import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { actions, preferences } from '../core/services';
import {
  concealShapeCards,
  createShapeFlipMatch,
  flipShapeCard,
  type ShapeFlipMatchState,
  type ShapeMatchCard,
} from '../games/shape-flip-match/rules';
import type { FishColor, FishShape } from '../games/fish-shape-match/rules';
import { addButton } from '../ui/button';
import { enableTapSelection } from '../ui/TapSelection';

interface CardDisplay {
  card: ShapeMatchCard;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  backText: Phaser.GameObjects.Text;
  symbol: Phaser.GameObjects.Shape;
  label: Phaser.GameObjects.Text;
  cleanupTap: () => void;
}

export class ShapeFlipMatchScene extends Phaser.Scene {
  private match: ShapeFlipMatchState = createShapeFlipMatch();
  private cards: CardDisplay[] = [];
  private feedbackText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private locked = false;

  constructor() {
    super('ShapeFlipMatch');
  }

  create(): void {
    this.match = createShapeFlipMatch();
    this.cards = [];
    this.locked = false;
    this.cameras.main.setBackgroundColor('#17324d');
    this.add.text(25, 18, 'Shape Flip Match', {
      fontFamily: 'Arial',
      fontSize: '39px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(25, 63, 'Flip two cards. Matching pairs stay face up.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#d7e8ff',
    });
    this.progressText = this.add
      .text(790, 45, '', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 1135, 47, 'Game Library', () => this.scene.start('GameHub'), 240);

    this.match.deck.forEach((card, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const display = this.createCard(card, 270 + column * 180, 175 + row * 190);
      this.cards.push(display);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const card of this.cards) card.cleanupTap();
      stopSpeaking();
    });
    this.feedbackText = this.add
      .text(640, 690, 'Tap a card to begin.', {
        fontFamily: 'Arial',
        fontSize: '23px',
        color: '#d7e8ff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5);
    this.refreshProgress();
  }

  update(): void {
    if (actions.wasPressed('cancel')) this.scene.start('GameHub');
  }

  private selectCard(cardId: string): void {
    if (this.locked) return;
    const result = flipShapeCard(this.match, cardId);
    if (!result.accepted) return;
    this.match = result.state;
    this.showCard(cardId);

    if (result.matchedPair) {
      for (const card of this.cards) {
        if (!this.match.matched.includes(card.card.id)) continue;
        card.background.setStrokeStyle(7, 0xffd65a);
        card.cleanupTap();
      }
      this.feedbackText.setText(result.spokenText);
      playPlacementTone(preferences.current.muted);
      speak(result.spokenText, preferences.current.muted);
      this.refreshProgress();
      if (this.match.complete) {
        this.locked = true;
        this.time.delayedCall(900, () => this.completeGame());
      }
      return;
    }

    speak(result.spokenText, preferences.current.muted);
    if (!result.needsConceal) {
      this.feedbackText.setText('Now choose one more card.');
      return;
    }

    const cardsToHide = [...this.match.revealed];
    this.locked = true;
    this.feedbackText.setText('Those are different. Watch them, then try again.');
    this.time.delayedCall(1100, () => {
      for (const id of cardsToHide) this.hideCard(id);
      this.match = concealShapeCards(this.match);
      this.locked = false;
      this.feedbackText.setText('Choose two more cards.');
    });
  }

  private createCard(card: ShapeMatchCard, x: number, y: number): CardDisplay {
    const background = this.add.rectangle(0, 0, 150, 160, 0x5b73a8).setStrokeStyle(6, 0xffffff);
    const backText = this.add
      .text(0, 0, '?', {
        fontFamily: 'Arial',
        fontSize: '64px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const symbol = this.createShape(
      card.shape,
      0,
      -22,
      this.shapeColor(card.color),
      1.35,
    ).setVisible(false);
    const label = this.add
      .text(0, 46, `${card.color}\n${card.shape}`, {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#17324d',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);
    const container = this.add
      .container(x, y, [background, backText, symbol, label])
      .setSize(150, 160);
    const cleanupTap = enableTapSelection(this, container, () => this.selectCard(card.id));
    return { card, container, background, backText, symbol, label, cleanupTap };
  }

  private showCard(cardId: string): void {
    const card = this.cards.find(({ card: data }) => data.id === cardId);
    if (!card) return;
    card.background.setFillStyle(0xfffbec);
    card.backText.setVisible(false);
    card.symbol.setVisible(true);
    card.label.setVisible(true);
    if (!preferences.current.reducedMotion)
      this.tweens.add({ targets: card.container, scaleX: 1.06, duration: 100, yoyo: true });
  }

  private hideCard(cardId: string): void {
    const card = this.cards.find(({ card: data }) => data.id === cardId);
    if (!card || this.match.matched.includes(cardId)) return;
    card.background.setFillStyle(0x5b73a8).setStrokeStyle(6, 0xffffff);
    card.backText.setVisible(true);
    card.symbol.setVisible(false);
    card.label.setVisible(false);
  }

  private refreshProgress(): void {
    this.progressText.setText(`Pairs: ${this.match.pairs} of 9`);
  }

  private completeGame(): void {
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.91).setOrigin(0);
    const panel = this.add.rectangle(640, 350, 760, 430, 0xfffbec).setStrokeStyle(8, 0xffd65a);
    const title = this.add
      .text(640, 245, 'You matched all nine pairs!', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#17324d',
        fontStyle: 'bold',
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

  private shapeColor(color: FishColor): number {
    return { red: 0xe84141, green: 0x36b765, blue: 0x3975df }[color];
  }

  private createShape(
    shape: FishShape,
    x: number,
    y: number,
    color: number,
    scale: number,
  ): Phaser.GameObjects.Shape {
    if (shape === 'circle') return this.add.circle(x, y, 21 * scale, color);
    if (shape === 'square') return this.add.rectangle(x, y, 40 * scale, 40 * scale, color);
    return this.add
      .triangle(x, y, 0, 42 * scale, 21 * scale, 0, 42 * scale, 42 * scale, color)
      .setOrigin(0.5);
  }
}
