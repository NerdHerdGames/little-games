import Phaser from 'phaser';
import { DrumAudio } from '../../accessibility/DrumAudio';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { StrikePadAdapter } from '../../input/StrikePadAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import {
  DRUMS,
  RHYTHMS,
  startRhythm,
  strikeRhythm,
  type Rhythm,
  type RhythmProgress,
} from './rules';
import './style.css';

export class DrumSimulatorScene extends Phaser.Scene {
  private menu!: ActionMenu;
  private audio!: DrumAudio;
  private rhythm: Rhythm | undefined;
  private progress: RhythmProgress = startRhythm();
  private readonly struck = new Map<string, number>();
  private leaving = false;

  constructor() {
    super('DrumSimulator');
  }

  create(): void {
    this.rhythm = undefined;
    this.progress = startRhythm();
    this.struck.clear();
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'drum-simulator', 'Drum Simulator');
    this.audio = new DrumAudio(this.menu.root, () => preferences.current.muted);
    const pads = new StrikePadAdapter(this.menu.root, actions);
    this.render();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      pads.destroy();
      this.audio.destroy();
      this.menu.destroy();
      this.struck.clear();
    });
  }

  update(time: number): void {
    if (this.leaving) return;
    let activation = this.menu.readActivation();
    while (activation && !this.leaving) {
      this.activate(activation, time);
      activation = actions.consumeActivation();
    }
    if (actions.wasPressed('cancel')) this.leave();
    for (const [id, until] of this.struck) {
      if (time < until) continue;
      this.menu.root.querySelector(`[data-action="pad:${id}"]`)?.classList.remove('struck');
      this.struck.delete(id);
    }
  }

  private activate(id: string, time: number): void {
    if (id === 'library') return this.leave();
    const drum = DRUMS.find((drum) => id === `pad:${drum.id}`);
    if (drum) {
      this.audio.play(drum);
      this.struck.set(drum.id, time + 180);
      this.menu.root.querySelector(`[data-action="${id}"]`)?.classList.add('struck');
      this.menu.root.querySelector<HTMLElement>('[data-last-hit]')!.textContent =
        `${drum.name} · ${drum.sound}`;
      if (this.rhythm) {
        const next = strikeRhythm(this.rhythm, this.progress, drum.id);
        if (next !== this.progress) {
          this.progress = next;
          this.paintRhythm();
        }
      }
      return;
    }
    if (id === 'mute') preferences.toggleMute();
    else if (id === 'motion') preferences.toggleReducedMotion();
    else if (id === 'restart') this.progress = startRhythm();
    else if (id === 'free' || id.startsWith('rhythm:')) {
      this.rhythm = RHYTHMS.find((rhythm) => id === `rhythm:${rhythm.id}`);
      this.progress = startRhythm();
    } else return;
    this.render(id);
  }

  private render(focus?: string): void {
    this.struck.clear();
    this.menu.root.classList.toggle('drums-still', preferences.current.reducedMotion);
    this.menu.setContent(`
      <header class="drums-header">
        <div><span class="drums-eyebrow">LITTLE GAMES · MUSIC ROOM</span><h1>Drum Simulator</h1></div>
        <nav aria-label="Drum options">
          <button data-action="mute" aria-pressed="${preferences.current.muted}">Sound ${preferences.current.muted ? 'off' : 'on'}</button>
          <button data-action="motion" aria-pressed="${preferences.current.reducedMotion}">Still view ${preferences.current.reducedMotion ? 'on' : 'off'}</button>
          <button data-action="library">Games</button>
        </nav>
      </header>
      <main class="drums-workspace">
        <aside class="drums-practice" aria-label="Choose a rhythm">
          <span class="drums-eyebrow">FIND YOUR RHYTHM</span>
          <button data-action="free" aria-pressed="${!this.rhythm}">Free play<span>Make a beat of your own</span></button>
          ${RHYTHMS.map((rhythm) => `<button data-action="rhythm:${rhythm.id}" aria-pressed="${this.rhythm === rhythm}">${rhythm.name}<span>${rhythm.steps.length} gentle steps</span></button>`).join('')}
          <p>Try one finger.<br>Then try two together.<br>There’s no hurry.</p>
        </aside>
        <div class="drums-main">
          <section class="drums-score" aria-label="Rhythm guide">
            <div class="drums-score-heading"><h2>${this.rhythm?.name ?? 'Your kit. Your beat.'}</h2>${this.rhythm ? '<button data-action="restart">Start again</button>' : '<span class="drums-badge">FREE PLAY</span>'}</div>
            <div data-rhythm></div>
            <p class="drums-help" data-help role="status"></p>
          </section>
          <section class="drums-instrument" aria-label="Eight-piece drum kit">
            <div class="drums-kit-heading"><span>Tap a drum to play</span><span>Keyboard: 1–8</span></div>
            <div class="drums-kit">
              ${DRUMS.map((drum) => `<button class="drums-pad drums-${drum.id} ${drum.voice === 'cymbal' ? 'drums-cymbal' : 'drums-skin'}" data-action="pad:${drum.id}" data-strike="${drum.key}" style="--drum-color:${drum.color};grid-area:${drum.id}" aria-label="Play ${drum.name}, key ${drum.key}" aria-keyshortcuts="${drum.key}"><span class="drums-pad-name">${drum.name}</span><span class="drums-pad-sound" aria-hidden="true">${drum.sound}</span><span class="drums-pad-key" aria-hidden="true">${drum.key}</span><span class="drums-hit-mark" aria-hidden="true">✓</span><span class="drums-next" aria-hidden="true">NEXT ↓</span></button>`).join('')}
            </div>
            <div class="drums-footer"><span data-last-hit>Let’s make some music.</span><span>Touch • Keyboard • Controller</span></div>
          </section>
        </div>
      </main>`);
    this.paintRhythm();
    if (focus)
      this.menu.root
        .querySelector<HTMLButtonElement>(`[data-action="${focus}"]`)
        ?.focus({ preventScroll: true });
  }

  private paintRhythm(): void {
    const score = this.menu.root.querySelector<HTMLElement>('[data-rhythm]')!;
    const help = this.menu.root.querySelector<HTMLElement>('[data-help]')!;
    const rhythm = this.rhythm;
    if (!rhythm) {
      score.innerHTML =
        '<p class="drums-welcome">Deep booms, little taps, and a splash of cymbal.<br>Explore every sound, or pick a rhythm to try.</p>';
      help.textContent = 'Tap the pads, press 1–8, or use arrows and Enter to choose a drum.';
    } else {
      score.innerHTML = `<ol class="drums-steps" aria-label="Rhythm steps">${rhythm.steps
        .map((id, index) => {
          const drum = DRUMS.find((drum) => drum.id === id)!;
          const done = index < this.progress.played;
          const next = index === this.progress.played;
          return `<li class="${done ? 'done' : ''}" ${next ? 'aria-current="step"' : ''}><span>${done ? '✓' : index + 1}</span>${drum.name}</li>`;
        })
        .join('')}</ol>`;
      const next = DRUMS.find((drum) => drum.id === rhythm.steps[this.progress.played]);
      help.textContent = this.progress.complete
        ? 'You played the rhythm! Keep exploring, or start again.'
        : `Next: ${next!.name}. Follow the names at your own pace. Every drum is yours to try.`;
      score
        .querySelector<HTMLElement>('[aria-current]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
    const expected = rhythm?.steps[this.progress.played];
    for (const drum of DRUMS) {
      const pad = this.menu.root.querySelector<HTMLButtonElement>(
        `[data-action="pad:${drum.id}"]`,
      )!;
      const next = drum.id === expected;
      pad.classList.toggle('expected', next);
      pad.setAttribute(
        'aria-label',
        `Play ${drum.name}, key ${drum.key}${next ? ', next drum' : ''}`,
      );
    }
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.audio.silence();
    goToScene(this, 'GameHub');
  }
}
