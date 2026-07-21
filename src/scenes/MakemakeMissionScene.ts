import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { goToScene } from '../core/SceneTransitions';
import { actions, preferences, progress } from '../core/services';
import { MAKEMAKE_HINT_DELAY_MS, MAKEMAKE_OBJECTIVES } from '../games/makemake/rules';
import { isSearchHintEligible, VisualSearchSession } from '../games/search/rules';
import { addButton } from '../ui/button';
import { enablePannableSearchView } from '../ui/PannableSearchView';
import { createPlanetArt, preloadPlanetArt } from '../ui/PlanetArt';

const VIEW = { x: 320, y: 125, width: 900, height: 500 } as const;
// Extra room on the right lets Makemake's moon reach the telescope crosshair.
// This keeps center-and-confirm selection equivalent to direct touch selection.
const WORLD = { width: 1950, height: 1000 } as const;
const TARGETS = [
  { id: 'makemake', x: 1370, y: 505, radius: 78 },
  { id: 'moon', x: 1490, y: 420, radius: 48 },
  { id: 'ice-one', x: 780, y: 290, radius: 55 },
  { id: 'ice-two', x: 1090, y: 760, radius: 60 },
] as const;

export class MakemakeMissionScene extends Phaser.Scene {
  private session!: VisualSearchSession;
  private world!: Phaser.GameObjects.Container;
  private panX = 100;
  private panY = 190;
  private feedback!: Phaser.GameObjects.Text;
  private objective!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private hintRing!: Phaser.GameObjects.Ellipse;
  private hintShown = false;
  private paused = false;
  private finishing = false;
  private pausePanel: Phaser.GameObjects.Container | undefined;
  private cleanupPan: (() => void) | undefined;

  constructor() {
    super('MakemakeMission');
  }

  preload(): void {
    preloadPlanetArt(this, ['makemake']);
  }

  create(): void {
    this.panX = 100;
    this.panY = 190;
    this.paused = false;
    this.finishing = false;
    this.hintShown = false;
    this.session = new VisualSearchSession(MAKEMAKE_OBJECTIVES, MAKEMAKE_HINT_DELAY_MS, () =>
      this.completeMission(),
    );
    this.cameras.main.setBackgroundColor('#0b182a');
    this.add.text(28, 28, 'Makemake Moon Search', {
      fontFamily: 'Arial',
      fontSize: '39px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.objective = this.add.text(28, 92, '', {
      fontFamily: 'Arial',
      fontSize: '23px',
      color: '#ffffff',
      wordWrap: { width: 270 },
    });
    this.feedback = this.add.text(28, 205, 'Drag the telescope view or use the arrows.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#d7e8ff',
      wordWrap: { width: 260 },
      lineSpacing: 5,
    });
    this.hint = this.add.text(28, 330, '', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#fff4c2',
      wordWrap: { width: 260 },
      fontStyle: 'bold',
    });
    addButton(this, 165, 490, 'Pause', () => this.togglePause(), 240);

    // Keep the pannable map behind the fixed objective panel and controls.
    this.world = this.add.container(VIEW.x - this.panX, VIEW.y - this.panY).setDepth(-10);
    const background = this.add.rectangle(
      WORLD.width / 2,
      WORLD.height / 2,
      WORLD.width,
      WORLD.height,
      0x071322,
    );
    this.world.add(background);
    for (let index = 0; index < 55; index += 1) {
      const x = 35 + ((index * 277) % 1870);
      const y = 30 + ((index * 163) % 930);
      const star = this.add.star(
        x,
        y,
        4,
        2,
        5 + (index % 4),
        index % 3 === 0 ? 0xfff4c2 : 0xd7e8ff,
      );
      this.world.add(star);
    }
    this.addWorldObject(780, 290, 48, 0xbcd9e8, 'Icy world');
    this.addWorldObject(1090, 760, 54, 0x9bb4c8, 'Distant object');
    this.addWorldObject(420, 700, 35, 0xd5c7a9, 'Small world');
    const makemakeArt = createPlanetArt(this, 'makemake', 0, 0, {
      maxWidth: 145,
      maxHeight: 145,
    });
    const makemakeLabel = this.add
      .text(0, 90, 'Makemake', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#10243d',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5);
    this.world.add(this.add.container(1370, 505, [makemakeArt, makemakeLabel]));
    const moon = this.addWorldObject(1490, 420, 28, 0xd9dde4, 'Small moon');
    moon.add(this.add.circle(-8, -5, 8, 0xaab2bf));
    this.hintRing = this.add
      .ellipse(1370, 505, 190, 190)
      .setStrokeStyle(8, 0xffd65a)
      .setFillStyle(0, 0)
      .setVisible(false);
    this.world.add(this.hintRing);

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff).fillRect(VIEW.x, VIEW.y, VIEW.width, VIEW.height);
    this.world.setMask(maskShape.createGeometryMask());
    this.add
      .rectangle(VIEW.x + VIEW.width / 2, VIEW.y + VIEW.height / 2, VIEW.width, VIEW.height)
      .setStrokeStyle(12, 0x89aac3)
      .setFillStyle(0, 0);
    this.add
      .line(
        0,
        0,
        VIEW.x + VIEW.width / 2 - 25,
        VIEW.y + VIEW.height / 2,
        VIEW.x + VIEW.width / 2 + 25,
        VIEW.y + VIEW.height / 2,
        0xfff4c2,
      )
      .setLineWidth(3);
    this.add
      .line(
        0,
        0,
        VIEW.x + VIEW.width / 2,
        VIEW.y + VIEW.height / 2 - 25,
        VIEW.x + VIEW.width / 2,
        VIEW.y + VIEW.height / 2 + 25,
        0xfff4c2,
      )
      .setLineWidth(3);
    this.add
      .text(VIEW.x + VIEW.width / 2, 655, 'Tap an object, or center it and press Go.', {
        fontFamily: 'Arial',
        fontSize: '21px',
        color: '#d7e8ff',
      })
      .setOrigin(0.5);
    const interactionZone = this.add.zone(
      VIEW.x + VIEW.width / 2,
      VIEW.y + VIEW.height / 2,
      VIEW.width,
      VIEW.height,
    );
    this.cleanupPan = enablePannableSearchView(this, interactionZone, {
      onPan: (deltaX, deltaY) => {
        if (!this.paused) this.panBy(-deltaX, -deltaY);
      },
      onTap: (x, y) => {
        if (!this.paused) this.selectAtScreen(x, y);
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupPan?.());
    this.refreshObjective();
    this.updateWorldPosition();
  }

  update(_time: number, delta: number): void {
    if (actions.wasPressed('pause')) this.togglePause();
    if (this.paused || this.finishing) return;
    const amount = (320 * Math.min(delta, 40)) / 1000;
    const x = Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft'));
    const y = Number(actions.isHeld('moveDown')) - Number(actions.isHeld('moveUp'));
    if (x || y) this.panBy(x * amount, y * amount);
    this.session.addActivity(Math.min(delta, 50));
    if (isSearchHintEligible(this.session.state)) this.showHint();
    if (actions.wasPressed('primaryAction') || actions.wasPressed('confirm'))
      this.selectAtScreen(VIEW.x + VIEW.width / 2, VIEW.y + VIEW.height / 2);
    if (actions.wasPressed('cancel')) goToScene(this, 'PlanetSelect');
  }

  private addWorldObject(
    x: number,
    y: number,
    radius: number,
    color: number,
    label: string,
  ): Phaser.GameObjects.Container {
    const body = this.add.circle(0, 0, radius, color).setStrokeStyle(5, 0xffffff);
    const text = this.add
      .text(0, radius + 18, label, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#10243d',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5);
    const object = this.add.container(x, y, [body, text]);
    this.world.add(object);
    return object;
  }

  private panBy(deltaX: number, deltaY: number): void {
    this.panX = Phaser.Math.Clamp(this.panX + deltaX, 0, WORLD.width - VIEW.width);
    this.panY = Phaser.Math.Clamp(this.panY + deltaY, 0, WORLD.height - VIEW.height);
    this.updateWorldPosition();
    if (this.hintShown) this.updateHintText();
  }

  private updateWorldPosition(): void {
    this.world.setPosition(VIEW.x - this.panX, VIEW.y - this.panY);
  }

  private selectAtScreen(screenX: number, screenY: number): void {
    const worldX = screenX - VIEW.x + this.panX;
    const worldY = screenY - VIEW.y + this.panY;
    const selected = TARGETS.find(
      (target) => Phaser.Math.Distance.Between(worldX, worldY, target.x, target.y) <= target.radius,
    );
    const result = this.session.select(selected?.id ?? 'empty-space');
    if (result.correct) {
      playPlacementTone(preferences.current.muted);
      this.feedback.setText(
        result.completedNow
          ? 'You found them both!'
          : 'You found Makemake! Now look nearby for its moon.',
      );
      this.hintShown = false;
      this.hint.setText('');
      this.hintRing.setVisible(false);
      if (!result.completedNow) this.refreshObjective();
    } else this.feedback.setText('That is an interesting object. Keep looking!');
  }

  private refreshObjective(): void {
    const current = this.session.state.objectives[this.session.state.objectiveIndex];
    this.objective.setText(`Find: ${current?.label ?? 'Makemake'}`);
  }

  private showHint(): void {
    if (!this.hintShown) {
      this.hintShown = true;
      this.hintRing.setVisible(true);
      if (!preferences.current.reducedMotion)
        this.tweens.add({
          targets: this.hintRing,
          alpha: 0.3,
          scale: 1.12,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
    }
    const target = this.currentTarget();
    this.hintRing.setPosition(target.x, target.y);
    this.updateHintText();
  }

  private updateHintText(): void {
    const target = this.currentTarget();
    const screenX = VIEW.x + target.x - this.panX;
    const screenY = VIEW.y + target.y - this.panY;
    const horizontal = screenX < VIEW.x ? '←' : screenX > VIEW.x + VIEW.width ? '→' : '';
    const vertical = screenY < VIEW.y ? '↑' : screenY > VIEW.y + VIEW.height ? '↓' : '';
    this.hint.setText(
      horizontal || vertical
        ? `Hint: explore ${horizontal}${vertical}`
        : 'Hint: look for the golden outline.',
    );
  }

  private currentTarget(): (typeof TARGETS)[number] {
    return this.session.state.objectiveIndex === 0 ? TARGETS[0] : TARGETS[1];
  }

  private completeMission(): void {
    this.finishing = true;
    progress.unlock('makemake');
    this.add
      .text(VIEW.x + VIEW.width / 2, VIEW.y + VIEW.height / 2, 'Makemake and its moon found!', {
        fontFamily: 'Arial',
        fontSize: '40px',
        color: '#17324d',
        backgroundColor: '#fff4c2',
        padding: { x: 24, y: 18 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.time.delayedCall(preferences.current.reducedMotion ? 350 : 850, () =>
      goToScene(this, 'FactCard', { planetId: 'makemake' }),
    );
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (!this.paused) {
      this.pausePanel?.destroy();
      this.pausePanel = undefined;
      return;
    }
    const shade = this.add.rectangle(0, 0, 1280, 720, 0x0d1b2a, 0.9).setOrigin(0);
    const title = this.add
      .text(640, 220, 'Paused', {
        fontFamily: 'Arial',
        fontSize: '54px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const resume = addButton(this, 640, 350, 'Keep Searching', () => this.togglePause(), 360);
    const leave = addButton(
      this,
      640,
      460,
      'Planet Selection',
      () => goToScene(this, 'PlanetSelect'),
      360,
    );
    this.pausePanel = this.add.container(0, 0, [shade, title, resume, leave]).setDepth(40);
  }
}
