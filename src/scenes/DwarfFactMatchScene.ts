import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { actions, preferences } from '../core/services';
import { PLANETS } from '../data/planets';
import {
  createDwarfFactMatch,
  dropDwarfForFact,
  DWARF_IDS,
  type DwarfFactMatchState,
  type DwarfId,
} from '../games/dwarf-fact-match/rules';
import { addButton } from '../ui/button';
import { enableDragPlacement } from '../ui/DragPlacement';
import { enableTapSelection } from '../ui/TapSelection';

const SLOT = { x: 640, y: 365, radius: 82 } as const;
const NAMES = Object.fromEntries(PLANETS.map(({ id, name }) => [id, name])) as Record<
  DwarfId,
  string
>;
const COLORS = Object.fromEntries(PLANETS.map(({ id, color }) => [id, color])) as Record<
  DwarfId,
  number
>;

interface DwarfChoice {
  id: DwarfId;
  display: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  startX: number;
  startY: number;
  cleanupDrag: () => void;
  matched: boolean;
}

export class DwarfFactMatchScene extends Phaser.Scene {
  private match: DwarfFactMatchState = createDwarfFactMatch();
  private choices: DwarfChoice[] = [];
  private factText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private starText!: Phaser.GameObjects.Text;
  private cleanupFactTap: (() => void) | undefined;
  private locked = false;

  constructor() {
    super('DwarfFactMatch');
  }

  create(): void {
    this.match = createDwarfFactMatch();
    this.choices = [];
    this.locked = false;
    this.cameras.main.setBackgroundColor('#10243d');
    this.add.text(25, 18, 'Dwarf Planet Fact Match', {
      fontFamily: 'Arial',
      fontSize: '38px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(
      25,
      63,
      'Drag the matching little world into the slot. Tap the fact to hear it.',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#d7e8ff',
      },
    );
    this.starText = this.add
      .text(760, 46, '', {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 1135, 48, 'Game Library', () => this.scene.start('GameHub'), 240);

    DWARF_IDS.forEach((id, index) => {
      const x = 240 + index * 200;
      const y = 150;
      const display = this.createDwarf(id, x, y).setDepth(10);
      const label = this.add
        .text(x, 215, NAMES[id], {
          fontFamily: 'Arial',
          fontSize: '19px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const cleanupDrag = enableDragPlacement(this, display, {
        onSelect: () => display.setDepth(25),
        onDrop: (dropX, dropY) => this.dropDwarf(id, dropX, dropY),
      });
      this.choices.push({ id, display, label, startX: x, startY: y, cleanupDrag, matched: false });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const choice of this.choices) choice.cleanupDrag();
      this.cleanupFactTap?.();
      stopSpeaking();
    });

    this.add.rectangle(640, 470, 1040, 410, 0xfffbec).setStrokeStyle(8, 0x7fa5c7);
    this.add.circle(SLOT.x, SLOT.y, SLOT.radius, 0xe7f0f4).setStrokeStyle(8, 0x17324d).setDepth(2);
    this.add
      .text(SLOT.x, SLOT.y, 'DWARF\nPLANET SLOT', {
        fontFamily: 'Arial',
        fontSize: '18px',
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
      .text(640, 610, '', {
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

  private dropDwarf(id: DwarfId, x: number, y: number): void {
    const choice = this.choices.find((item) => item.id === id);
    if (!choice) return;
    if (this.locked || choice.matched) {
      this.resetChoice(choice);
      return;
    }
    if (Phaser.Math.Distance.Between(x, y, SLOT.x, SLOT.y) > SLOT.radius + 45) {
      this.resetChoice(choice);
      this.feedbackText.setText('Bring a dwarf planet into the round slot.');
      return;
    }
    const result = dropDwarfForFact(this.match, id);
    if (!result.correct) {
      this.resetChoice(choice);
      this.feedbackText.setText(`Not that world yet. Hint: ${result.hint}`);
      return;
    }
    this.match = result.state;
    this.locked = true;
    choice.matched = true;
    choice.cleanupDrag();
    choice.display.setPosition(SLOT.x, SLOT.y).setDepth(15);
    choice.label.setText(`★ ${NAMES[id]}`).setColor('#fff4c2');
    this.feedbackText.setText('That matches! You earned a star.');
    playPlacementTone(preferences.current.muted);
    this.refreshStars();
    if (!preferences.current.reducedMotion)
      this.tweens.add({ targets: choice.display, scale: 1.18, duration: 180, yoyo: true });
    this.time.delayedCall(preferences.current.reducedMotion ? 150 : 600, () => {
      this.resetChoice(choice);
      this.locked = false;
      if (this.match.complete) this.completeGame();
      else this.refreshRound();
    });
  }

  private resetChoice(choice: DwarfChoice): void {
    choice.display.setPosition(choice.startX, choice.startY).setDepth(10);
  }
  private refreshRound(): void {
    this.factText.setText(this.match.current?.text ?? 'All dwarf planets matched!');
    this.feedbackText.setText('Which little world matches this fact?');
    this.refreshStars();
  }
  private refreshStars(): void {
    this.starText.setText(
      `Stars: ${'★'.repeat(this.match.stars)}${'○'.repeat(5 - this.match.stars)}`,
    );
  }

  private completeGame(): void {
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.88).setOrigin(0);
    const panel = this.add.rectangle(640, 350, 760, 430, 0xfffbec).setStrokeStyle(8, 0xffd65a);
    const title = this.add
      .text(640, 245, 'Five stars! You matched every little world!', {
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

  private createDwarf(id: DwarfId, x: number, y: number): Phaser.GameObjects.Container {
    const parts: Phaser.GameObjects.GameObject[] = [];
    if (id === 'haumea')
      parts.push(this.add.ellipse(0, 0, 86, 48, COLORS[id]).setStrokeStyle(4, 0xffffff));
    else
      parts.push(
        this.add.circle(0, 0, id === 'pluto' ? 36 : 33, COLORS[id]).setStrokeStyle(4, 0xffffff),
      );
    if (id === 'ceres') parts.push(this.add.circle(9, -5, 7, 0xf2eadf));
    if (id === 'pluto') parts.push(this.add.ellipse(4, 2, 25, 24, 0xf2ddd0));
    if (id === 'makemake') parts.push(this.add.ellipse(-5, -5, 36, 10, 0xe2a083));
    if (id === 'eris') parts.push(this.add.circle(-8, -7, 9, 0xc8d0d8));
    return this.add.container(x, y, parts).setSize(130, 110);
  }
}
