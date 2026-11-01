import Phaser from 'phaser';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { XylophoneAudio } from '../../core/XylophoneAudio';
import { StrikePadAdapter } from '../../input/StrikePadAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import { BARS, TUNES, startTune, strikeNote, type Tune, type TuneProgress } from './rules';
import './style.css';

export class XylophonePlayerScene extends Phaser.Scene {
  private menu!: ActionMenu;
  private audio!: XylophoneAudio;
  private tune: Tune | undefined;
  private progress: TuneProgress = startTune();
  private readonly struck = new Map<string, number>();
  private readonly scoreAnimations: Animation[] = [];
  private leaving = false;

  constructor() {
    super('XylophonePlayer');
  }

  create(): void {
    this.tune = undefined;
    this.progress = startTune();
    this.struck.clear();
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'xylophone-player', 'Xylophone Player');
    this.audio = new XylophoneAudio(this.menu.root, () => preferences.current.muted);
    const pads = new StrikePadAdapter(this.menu.root, actions);
    this.render();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      pads.destroy();
      this.audio.destroy();
      this.menu.destroy();
      this.struck.clear();
      this.stopScoreAnimations();
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
      this.menu.root.querySelector(`[data-action="bar:${id}"]`)?.classList.remove('struck');
      this.struck.delete(id);
    }
  }

  private activate(id: string, time: number): void {
    if (id === 'library') return this.leave();
    const bar = BARS.find((bar) => id === `bar:${bar.id}`);
    if (bar) {
      this.audio.play(bar.midi);
      this.struck.set(bar.id, time + 180);
      this.menu.root.querySelector(`[data-action="${id}"]`)?.classList.add('struck');
      this.menu.root.querySelector<HTMLElement>('[data-last-note]')!.textContent = bar.name;
      if (this.tune) {
        const next = strikeNote(this.tune, this.progress, bar.id);
        if (next !== this.progress) {
          const changedLine = next.row !== this.progress.row;
          this.progress = next;
          this.paintTune(changedLine);
        }
      }
      return;
    }
    if (id === 'mute') preferences.toggleMute();
    else if (id === 'motion') preferences.toggleReducedMotion();
    else if (id === 'restart') this.progress = startTune();
    else if (id === 'free' || id.startsWith('tune:')) {
      this.tune = TUNES.find((tune) => id === `tune:${tune.id}`);
      this.progress = startTune();
    } else return;
    this.render(id);
  }

  private render(focus?: string): void {
    this.struck.clear();
    this.menu.root.classList.toggle('xylo-still', preferences.current.reducedMotion);
    this.menu.setContent(`
      <header class="xylo-header">
        <div><span class="xylo-eyebrow">LITTLE GAMES · MUSIC ROOM</span><h1>Xylophone Player</h1></div>
        <nav aria-label="Xylophone options">
          <button data-action="mute" aria-pressed="${preferences.current.muted}">Sound ${preferences.current.muted ? 'off' : 'on'}</button>
          <button data-action="motion" aria-pressed="${preferences.current.reducedMotion}">Still view ${preferences.current.reducedMotion ? 'on' : 'off'}</button>
          <button data-action="library">Games</button>
        </nav>
      </header>
      <div class="xylo-workspace">
        <nav class="xylo-tunes" aria-label="Choose a tune">
          <span class="xylo-eyebrow">LITTLE TUNES</span>
          <button data-action="free" aria-pressed="${!this.tune}">Free play<span>Make your own music</span></button>
          ${TUNES.map((tune) => `<button data-action="tune:${tune.id}" aria-pressed="${this.tune === tune}">${tune.name}<span>${tune.rows.reduce((total, row) => total + row.length, 0)} notes · ${tune.rows.length} ${tune.rows.length === 1 ? 'line' : 'lines'}</span></button>`).join('')}
        </nav>
        <main class="xylo-main">
          <section class="xylo-score" aria-label="Tune guide">
            <div class="xylo-score-heading"><h2>${this.tune?.name ?? 'A rainbow of notes.'}</h2>${this.tune ? '<button data-action="restart">Start again</button>' : '<span class="xylo-badge">FREE PLAY</span>'}</div>
            <div data-tune></div>
            <p class="xylo-help" data-help role="status"></p>
          </section>
          <section class="xylo-instrument" aria-label="Eight-note xylophone, C5 to C6">
            <div class="xylo-instrument-heading"><span>Tap a bar to play</span><span>Keyboard: 1–8</span></div>
            <div class="xylo-frame">
              ${BARS.map((bar) => `<button class="xylo-bar" data-action="bar:${bar.id}" data-strike="${bar.key}" style="--bar-color:${bar.color};--bar-length:${bar.length}%" aria-label="Play ${bar.name}, key ${bar.key}" aria-keyshortcuts="${bar.key}"><span class="xylo-next" aria-hidden="true">NEXT</span><span class="xylo-note">${bar.label}<small>${bar.id === 'c' ? 'low' : bar.id === 'high-c' ? 'high' : ' '}</small></span><span class="xylo-key" aria-hidden="true">${bar.key}</span><span class="xylo-hit" aria-hidden="true">✓</span></button>`).join('')}
            </div>
            <div class="xylo-footer"><span data-last-note>Let’s make some music.</span><span>Low notes to high notes</span></div>
          </section>
        </main>
      </div>`);
    this.paintTune();
    if (focus)
      this.menu.root
        .querySelector<HTMLButtonElement>(`[data-action="${focus}"]`)
        ?.focus({ preventScroll: true });
  }

  private paintTune(animate = false): void {
    this.stopScoreAnimations();
    const score = this.menu.root.querySelector<HTMLElement>('[data-tune]')!;
    const help = this.menu.root.querySelector<HTMLElement>('[data-help]')!;
    const tune = this.tune;
    const { row, note, played, complete } = this.progress;
    const previous = score.querySelector<HTMLElement>('.xylo-steps');
    const outgoing =
      animate && !preferences.current.reducedMotion
        ? (previous?.cloneNode(true) as HTMLElement | undefined)
        : undefined;
    if (!tune) {
      score.innerHTML = '<p class="xylo-welcome">Explore the bars, or choose a little tune.</p>';
      help.textContent = '';
    } else {
      const total = tune.rows.reduce((sum, line) => sum + line.length, 0);
      score.innerHTML = `<div class="xylo-progress"><span>${complete ? 'Tune complete ✓' : `Line ${row + 1} of ${tune.rows.length}`}</span><span>${played} / ${total} notes</span></div>
        <div class="xylo-line"><ol class="xylo-steps" aria-label="Line ${row + 1}">${tune.rows[
          row
        ]!.map((id, index) => {
          const bar = BARS.find((bar) => bar.id === id)!;
          const done = complete || index < note;
          return `<li class="${done ? 'done' : ''}" ${!done && index === note ? 'aria-current="step"' : ''} style="--bar-color:${bar.color}"><span>${done ? '✓' : index + 1}</span>${bar.name}</li>`;
        }).join('')}</ol></div>`;
      const next = BARS.find((bar) => bar.id === tune.rows[row]?.[note]);
      help.textContent = complete
        ? 'You played the tune! Play more, or start again.'
        : `Line ${row + 1} of ${tune.rows.length}. Next: ${next!.name}. Take your time.`;
      const current = score.querySelector<HTMLElement>('[aria-current]');
      const scroll = score.querySelector<HTMLElement>('.xylo-steps')!;
      if (current) scroll.scrollLeft = Math.max(0, current.offsetLeft - scroll.clientWidth / 2);
      if (outgoing) {
        outgoing.setAttribute('aria-hidden', 'true');
        for (const entry of outgoing.querySelectorAll('li')) {
          entry.className = 'done';
          entry.removeAttribute('aria-current');
          entry.querySelector('span')!.textContent = '✓';
        }
        outgoing.classList.add('xylo-outgoing');
        score.querySelector('.xylo-line')!.append(outgoing);
        outgoing.scrollLeft = previous?.scrollLeft ?? 0;
        const exit = outgoing.animate(
          [
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(-100%)', opacity: 0 },
          ],
          { duration: 260, easing: 'ease-out', fill: 'forwards' },
        );
        exit.onfinish = () => outgoing.remove();
        this.scoreAnimations.push(
          exit,
          scroll.animate(
            [
              { transform: 'translateY(45px)', opacity: 0 },
              { transform: 'translateY(0)', opacity: 1 },
            ],
            { duration: 260, easing: 'ease-out' },
          ),
        );
      }
    }
    const expected = complete ? undefined : tune?.rows[row]?.[note];
    for (const bar of BARS) {
      const pad = this.menu.root.querySelector<HTMLButtonElement>(`[data-action="bar:${bar.id}"]`)!;
      const next = expected === bar.id;
      pad.classList.toggle('expected', next);
      pad.setAttribute(
        'aria-label',
        `Play ${bar.name}, key ${bar.key}${next ? ', next note' : ''}`,
      );
    }
    help.hidden = !tune;
  }

  private stopScoreAnimations(): void {
    for (const animation of this.scoreAnimations) animation.cancel();
    this.scoreAnimations.length = 0;
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.audio.silence();
    goToScene(this, 'GameHub');
  }
}
