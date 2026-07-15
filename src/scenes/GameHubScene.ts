import Phaser from 'phaser';
import { goToScene } from '../core/SceneTransitions';
import { actions } from '../core/services';
import { GAMES } from '../games/registry';
import { MenuFocus } from '../ui/MenuFocus';
import { addButton } from '../ui/button';

const COLUMNS = 2;
const PAGE_SIZE = 4;

export class GameHubScene extends Phaser.Scene {
  private focus = new MenuFocus(GAMES.length);
  private cards: Phaser.GameObjects.Container[] = [];
  private status!: Phaser.GameObjects.Text;
  private pageText!: Phaser.GameObjects.Text;
  constructor() {
    super('GameHub');
  }

  create(): void {
    this.cards = [];
    this.cameras.main.setBackgroundColor('#f6f1df');
    this.add
      .text(640, 52, 'Little Games', {
        fontFamily: 'Arial',
        fontSize: '58px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 94, 'Choose a game to play', {
        fontFamily: 'Arial',
        fontSize: '27px',
        color: '#46627a',
      })
      .setOrigin(0.5);
    GAMES.forEach((game, index) => {
      const pageIndex = index % PAGE_SIZE;
      const page = Math.floor(index / PAGE_SIZE);
      const itemsOnPage = Math.min(PAGE_SIZE, GAMES.length - page * PAGE_SIZE);
      const column = pageIndex % COLUMNS;
      const row = Math.floor(pageIndex / COLUMNS);
      const x =
        itemsOnPage % COLUMNS === 1 && pageIndex === itemsOnPage - 1 ? 640 : 350 + column * 580;
      const y = 285 + row * 275;
      const panel = this.add.rectangle(0, 0, 500, 235, 0xffffff).setStrokeStyle(6, 0x46627a);
      const icon = this.add.circle(-165, -10, 70, game.accentColor).setStrokeStyle(5, 0x17324d);
      const symbol = this.add
        .text(-165, -12, game.symbol, {
          fontFamily: 'Arial',
          fontSize: '78px',
          color: '#17324d',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const title = this.add
        .text(-65, -70, game.title, {
          fontFamily: 'Arial',
          fontSize: '36px',
          color: '#17324d',
          fontStyle: 'bold',
          wordWrap: { width: 300 },
        })
        .setOrigin(0, 0.5);
      const description = this.add
        .text(-65, 0, game.description, {
          fontFamily: 'Arial',
          fontSize: '21px',
          color: '#46627a',
          wordWrap: { width: 300 },
          lineSpacing: 6,
        })
        .setOrigin(0, 0.5);
      const play = this.add
        .text(70, 82, 'Tap to Play', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#17324d',
          backgroundColor: '#ffd65a',
          padding: { x: 20, y: 10 },
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const card = this.add
        .container(x, y, [panel, icon, symbol, title, description, play])
        .setSize(500, 235)
        .setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        this.focus.set(index);
        this.refresh();
      });
      card.on('pointerup', () => this.activate());
      this.cards.push(card);
    });
    this.status = this.add
      .text(640, 125, '', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.pageText = this.add
      .text(640, 150, '', { fontFamily: 'Arial', fontSize: '20px', color: '#46627a' })
      .setOrigin(0.5);
    if (GAMES.length > PAGE_SIZE) {
      addButton(this, 155, 110, 'Previous Page', () => this.changePage(-1), 250);
      addButton(this, 1125, 110, 'Next Page', () => this.changePage(1), 250);
    }
    this.refresh();
  }

  update(): void {
    if (actions.wasPressed('moveRight') || actions.wasPressed('moveDown')) {
      this.focus.next();
      this.refresh();
    }
    if (actions.wasPressed('moveLeft') || actions.wasPressed('moveUp')) {
      this.focus.previous();
      this.refresh();
    }
    if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction')) this.activate();
  }
  private activate(): void {
    const game = GAMES[this.focus.current];
    if (game) goToScene(this, game.sceneKey);
  }
  private refresh(): void {
    const page = Math.floor(this.focus.current / PAGE_SIZE);
    this.cards.forEach((card, index) => {
      card.setVisible(Math.floor(index / PAGE_SIZE) === page);
      card.setScale(index === this.focus.current ? 1.04 : 1);
    });
    this.status.setText(`Selected: ${GAMES[this.focus.current]?.title ?? 'Game'}`);
    this.pageText.setText(
      GAMES.length > PAGE_SIZE ? `Page ${page + 1} of ${Math.ceil(GAMES.length / PAGE_SIZE)}` : '',
    );
  }

  private changePage(direction: -1 | 1): void {
    const pages = Math.ceil(GAMES.length / PAGE_SIZE);
    const current = Math.floor(this.focus.current / PAGE_SIZE);
    const page = (current + direction + pages) % pages;
    this.focus.set(Math.min(page * PAGE_SIZE, GAMES.length - 1));
    this.refresh();
  }
}
