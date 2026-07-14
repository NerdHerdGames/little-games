import Phaser from 'phaser';
import { stopSpeaking, speak } from '../accessibility/Speech';
import { actions, preferences, progress } from '../core/services';
import { goToScene } from '../core/SceneTransitions';
import { FACTS_BY_PLANET, PLANETS } from '../data/planets';
import type { PlanetId } from '../storage/ProgressStore';
import { addButton } from '../ui/button';

type FactPlanetId = keyof typeof FACTS_BY_PLANET;

export class FactCardScene extends Phaser.Scene {
  private index = 0;
  private planetId: FactPlanetId = 'ceres';
  private facts: readonly string[] = FACTS_BY_PLANET.ceres;
  private fact!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;
  constructor() {
    super('FactCard');
  }

  create(data: { planetId?: PlanetId } = {}): void {
    this.index = 0;
    this.planetId = isFactPlanetId(data.planetId) ? data.planetId : 'ceres';
    this.facts = FACTS_BY_PLANET[this.planetId];
    const planet = PLANETS.find((candidate) => candidate.id === this.planetId);
    this.cameras.main.setBackgroundColor('#17324d');
    const illustration = this.add
      .circle(230, 340, 125, planet?.color ?? 0xb9a58d)
      .setStrokeStyle(7, 0xf4e3c7);
    if (this.planetId === 'haumea') {
      illustration.setScale(1.35, 0.72);
      this.add.ellipse(230, 340, 350, 125).setStrokeStyle(5, 0xfff4c2).setFillStyle(0, 0);
    }
    if (this.planetId === 'makemake') {
      this.add.circle(355, 255, 24, 0xd9dde4).setStrokeStyle(4, 0xffffff);
      this.add.line(0, 0, 300, 280, 340, 260, 0xfff4c2).setLineWidth(4);
    }
    this.add.circle(190, 300, 27, 0x82746a);
    this.add.circle(275, 380, 38, 0x82746a);
    if (this.planetId === 'pluto')
      this.add
        .text(230, 335, '♥', { fontFamily: 'Arial', fontSize: '105px', color: '#f5eee5' })
        .setOrigin(0.5);
    this.add
      .text(720, 110, `${planet?.name ?? 'Planet'} Discovery Card`, {
        fontFamily: 'Arial',
        fontSize: '47px',
        color: '#fff4c2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.fact = this.add
      .text(720, 300, '', {
        fontFamily: 'Arial',
        fontSize: '38px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 680 },
        lineSpacing: 12,
      })
      .setOrigin(0.5);
    this.counter = this.add
      .text(720, 445, '', { fontFamily: 'Arial', fontSize: '22px', color: '#c7d9ed' })
      .setOrigin(0.5);
    addButton(this, 500, 555, 'Previous', () => this.previous(), 250);
    addButton(this, 790, 555, 'Next', () => this.next(), 250);
    addButton(
      this,
      270,
      650,
      'Read Aloud',
      () => speak(this.facts[this.index] ?? '', preferences.current.muted),
      260,
    );
    addButton(this, 930, 650, 'Finish Mission', () => this.finish(), 320);
    this.refresh();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stopSpeaking);
  }

  update(): void {
    if (actions.wasPressed('moveRight')) this.next();
    if (actions.wasPressed('moveLeft')) this.previous();
    if (actions.wasPressed('confirm')) {
      if (this.index === this.facts.length - 1) this.finish();
      else this.next();
    }
    if (actions.wasPressed('cancel')) goToScene(this, 'PlanetSelect');
  }
  private next(): void {
    this.index = Math.min(this.facts.length - 1, this.index + 1);
    this.refresh();
  }
  private previous(): void {
    this.index = Math.max(0, this.index - 1);
    this.refresh();
  }
  private refresh(): void {
    stopSpeaking();
    this.fact.setText(this.facts[this.index] ?? '');
    this.counter.setText(`Fact ${this.index + 1} of ${this.facts.length}`);
  }
  private finish(): void {
    progress.unlock(this.planetId);
    if (progress.areAllUnlocked()) goToScene(this, 'AllWorldsCelebration');
    else goToScene(this, 'BadgeCollection', { fromMission: true });
  }
}

const isFactPlanetId = (value: PlanetId | undefined): value is FactPlanetId =>
  value !== undefined && value in FACTS_BY_PLANET;
