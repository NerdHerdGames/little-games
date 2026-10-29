import Phaser from 'phaser';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { ActionMenu } from '../../ui/ActionMenu';
import {
  COURSES,
  createPlatformer,
  PHYSICS_STEP,
  platformerCameraX,
  stepPlatformer,
  type PlatformerMode,
  type PlatformerState,
} from './rules';
import './style.css';

type Screen = 'ready' | 'playing' | 'paused' | 'retry' | 'complete';
const TITLES = { manual: 'Meadow Jumper', runner: 'Bunny Run' } as const;

/** Two library games share presentation and physics, with separate courses and controls. */
export class PlatformerScene extends Phaser.Scene {
  private state!: PlatformerState;
  private screen: Screen = 'ready';
  private menu!: ActionMenu;
  private world!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Container;
  private stars: Phaser.GameObjects.Star[] = [];
  private flags: Phaser.GameObjects.Text[] = [];
  private accumulator = 0;
  private jumpPending = false;
  private leaving = false;

  constructor(private readonly mode: PlatformerMode) {
    super(mode === 'manual' ? 'MeadowJumper' : 'BunnyRun');
  }

  create(): void {
    this.state = createPlatformer(this.mode);
    this.screen = 'ready';
    this.accumulator = 0;
    this.jumpPending = false;
    this.leaving = false;
    this.stars = [];
    this.flags = [];
    this.cameras.main.setBackgroundColor(this.mode === 'manual' ? '#dff6ef' : '#e7efff');
    this.createLandscape();
    this.menu = new ActionMenu(actions, 'platformer-ui', TITLES[this.mode]);
    this.renderMenu();
    this.paint();
    const onVisibility = (): void => {
      if (document.hidden && this.screen === 'playing' && !this.leaving) {
        this.screen = 'paused';
        this.renderMenu();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onVisibility);
      this.menu.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (this.leaving) return;
    // During play, jump and direction actions belong exclusively to the character.
    const activation =
      this.screen === 'playing' ? actions.consumeActivation() : this.menu.readActivation();
    if (activation) {
      this.activate(activation);
      return;
    }
    if (actions.wasPressed('pause') || actions.wasPressed('cancel')) {
      if (this.screen === 'playing') this.screen = 'paused';
      else if (this.screen === 'paused') this.screen = 'playing';
      else if (actions.wasPressed('cancel')) {
        this.leave();
        return;
      }
      this.renderMenu();
      return;
    }
    if (this.screen !== 'playing' || document.hidden) return;
    this.jumpPending ||= actions.wasPressed('primaryAction') || actions.wasPressed('confirm');
    this.accumulator += Math.min(delta, 80) / 1000;
    const previousCollected = this.state.collected.filter(Boolean).length;
    while (this.accumulator >= PHYSICS_STEP) {
      this.accumulator -= PHYSICS_STEP;
      const event = stepPlatformer(this.state, this.mode, {
        direction: Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft')),
        jumpPressed: this.jumpPending,
      });
      this.jumpPending = false;
      if (event === 'rescue' || event === 'complete') {
        this.screen = event === 'rescue' ? 'retry' : 'complete';
        if (event === 'complete') playPlacementTone(preferences.current.muted);
        this.accumulator = 0;
        this.renderMenu();
        break;
      }
      if (event === 'checkpoint')
        this.setHelp('Checkpoint saved! Keep going toward the picnic flag.');
    }
    if (this.state.collected.filter(Boolean).length > previousCollected)
      playPlacementTone(preferences.current.muted);
    this.paint();
  }

  private createLandscape(): void {
    // The backdrop stays still: no parallax, camera shake, or flashing feedback.
    this.add.circle(1120, 185, 46, 0xffd65a);
    for (let index = 0; index < 5; index += 1) {
      this.add.ellipse(index * 320, 600, 520, 340, 0xb7d9c3);
      this.add.ellipse(140 + index * 320, 670, 410, 250, 0x94c5ad);
    }
    this.add.rectangle(640, 700, 1280, 40, 0x6eaa99);
    this.world = this.add.container(0, 0);
    const course = COURSES[this.mode];
    course.platforms.forEach((platform, index) => {
      const ground = this.add
        .rectangle(platform.x, platform.top, platform.width, 175, 0xae805b)
        .setOrigin(0);
      const grass = this.add
        .rectangle(platform.x, platform.top, platform.width, 18, 0x427958)
        .setOrigin(0);
      const edge = this.add
        .rectangle(platform.x + platform.width - 12, platform.top + 9, 12, 52, 0xffefb5)
        .setOrigin(0);
      const marker = this.add.text(platform.x + 30, platform.top + 30, `${index + 1}`, {
        fontFamily: 'Arial',
        fontSize: '25px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      const flag = this.add.text(platform.x + 72, platform.top - 65, index === 0 ? '✓' : '⚑', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#17324d',
      });
      const star = this.add
        .star(platform.x + platform.width / 2, platform.top - 70, 5, 13, 27, 0xffd65a)
        .setStrokeStyle(3, 0x805800);
      this.world.add([ground, grass, edge, marker, flag, star]);
      this.stars.push(star);
      this.flags.push(flag);
    });
    const finish = course.platforms.at(-1)!;
    this.world.add([
      this.add.rectangle(course.finishX, finish.top - 65, 8, 130, 0x17324d),
      this.add.triangle(course.finishX + 42, finish.top - 105, 0, 0, 80, 22, 0, 44, 0xffd65a),
      this.add.text(course.finishX - 45, finish.top + 30, 'PICNIC', {
        fontFamily: 'Arial',
        fontSize: '23px',
        color: '#ffffff',
        fontStyle: 'bold',
      }),
    ]);
    const body = this.add.ellipse(0, -25, 45, 48, 0xfffaf0).setStrokeStyle(3, 0x17324d);
    const ears = [-10, 10].map((x) =>
      this.add.ellipse(x, -57, 12, 31, 0xfffaf0).setStrokeStyle(3, 0x17324d),
    );
    const eyes = [-8, 8].map((x) => this.add.circle(x, -29, 3, 0x17324d));
    const nose = this.add.circle(0, -20, 4, 0x9a4d79);
    const feet = this.add.ellipse(0, -3, 46, 12, 0xf4c5ad).setStrokeStyle(2, 0x17324d);
    this.player = this.add.container(0, 0, [...ears, body, feet, ...eyes, nose]);
    this.world.add(this.player);
  }

  private paint(): void {
    this.world.x = -platformerCameraX(this.state.x, this.mode, preferences.current.reducedMotion);
    this.player.setPosition(this.state.x, this.state.y);
    // Decorative leaning is removed in still view; jump movement is always essential.
    this.player.rotation =
      preferences.current.reducedMotion || this.state.grounded ? 0 : this.state.velocityY * 0.00012;
    this.stars.forEach((star, index) => star.setVisible(!this.state.collected[index]));
    this.flags.forEach((flag, index) => flag.setText(index <= this.state.checkpoint ? '✓' : '⚑'));
  }

  private instructions(): string {
    return this.mode === 'manual'
      ? 'Hold Left or Right to move. Tap Jump to hop across the gaps.'
      : 'Bunny runs by itself. Tap Jump near the striped edge to hop across each gap.';
  }

  private renderMenu(): void {
    const screen = this.screen;
    const titles = {
      ready: 'Let’s hop to the picnic!',
      playing: '',
      paused: 'Take a little break.',
      retry: 'A soft landing. Try again!',
      complete: 'You reached the picnic!',
    };
    const copy =
      screen === 'ready'
        ? `${this.instructions()} The numbered flags save your place. Stars are optional. Keyboard: ${this.mode === 'manual' ? 'arrows or A/D to move; ' : ''}Space to jump, P to pause.`
        : screen === 'retry'
          ? 'You’re back at your last flag. Your stars are safe. Take your time and try another hop.'
          : screen === 'complete'
            ? `A lovely adventure! You found ${this.state.collected.filter(Boolean).length} of ${this.state.collected.length} stars. Play again whenever you like.`
            : 'Your bunny and stars will wait right here.';
    this.menu.setContent(`
      <header><h1>${TITLES[this.mode]}</h1><nav aria-label="Game options">
        <button data-action="mute" aria-pressed="${preferences.current.muted}">Sound ${preferences.current.muted ? 'off' : 'on'}</button>
        <button data-action="motion" aria-pressed="${preferences.current.reducedMotion}">Still view ${preferences.current.reducedMotion ? 'on' : 'off'}</button>
        ${screen === 'playing' ? '<button data-action="pause">Pause</button>' : ''}
        <button data-action="library">Games</button>
      </nav></header>
      <p class="platformer-help" role="status" data-help>${this.instructions()}</p>
      ${screen === 'playing' ? '' : `<div class="platformer-panel"><section class="platformer-card" role="dialog" aria-modal="true" aria-labelledby="platformer-title" aria-describedby="platformer-copy"><h2 id="platformer-title">${titles[screen]}</h2><p id="platformer-copy">${copy}</p><footer><button data-action="play">${screen === 'complete' ? 'Play again' : screen === 'ready' ? 'Let’s play' : screen === 'retry' ? 'Try again' : 'Keep playing'}</button>${screen === 'paused' ? '<button data-action="restart">Start again</button>' : ''}<button data-action="library">Game Library</button></footer></section></div>`}
    `);
    const modal = this.menu.root.querySelector<HTMLElement>('.platformer-panel');
    this.menu.root.querySelector('header')?.toggleAttribute('inert', Boolean(modal));
    this.menu.refreshButtons();
    if (modal)
      this.menu.root
        .querySelector<HTMLButtonElement>('[data-action="play"]')
        ?.focus({ preventScroll: true });
  }

  private activate(id: string): void {
    if (id === 'library') return this.leave();
    if (id === 'mute') preferences.toggleMute();
    else if (id === 'motion') preferences.toggleReducedMotion();
    else if (id === 'pause' && this.screen === 'playing') this.screen = 'paused';
    else if (id === 'restart' || (id === 'play' && this.screen === 'complete')) {
      this.state = createPlatformer(this.mode);
      this.screen = 'playing';
    } else if (id === 'play') this.screen = 'playing';
    else return;
    this.accumulator = 0;
    this.jumpPending = false;
    this.paint();
    this.renderMenu();
  }

  private setHelp(text: string): void {
    const help = this.menu.root.querySelector('[data-help]');
    if (help) help.textContent = text;
  }

  private leave(): void {
    this.leaving = true;
    this.menu.root.hidden = true;
    goToScene(this, 'GameHub');
  }
}
