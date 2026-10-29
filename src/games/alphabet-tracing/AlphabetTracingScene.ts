import Phaser from 'phaser';
import { LetterSpeech } from '../../accessibility/LetterSpeech';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { TraceAdapter } from '../../input/TraceAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import { LETTERS } from './letters';
import {
  nextLetterIndex,
  pointAt,
  startTrace,
  strokeLength,
  tracePoint,
  type TraceState,
} from './rules';
import './style.css';

const button = (action: string, text: string, extra = ''): string =>
  `<button type="button" data-action="${action}" ${extra}>${text}</button>`;
const pencil =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 31 31 10l9 9-21 21-12 3Z" fill="#f2bd68" stroke="currentColor" stroke-width="2.5"/><path d="m10 31 9 9m8-26 9 9M7 43l4-10 6 6Z" fill="#fffaf0" stroke="currentColor" stroke-width="2.5"/></svg>';

export class AlphabetTracingScene extends Phaser.Scene {
  private menu!: ActionMenu;
  private adapter!: TraceAdapter;
  private speech!: LetterSpeech;
  private index: number | undefined;
  private trace: TraceState = startTrace();
  private leaving = false;
  private completed = new Set<number>();
  private speechCheck = 0;

  constructor() {
    super('AlphabetTracing');
  }

  create(): void {
    this.index = undefined;
    this.trace = startTrace();
    this.completed = new Set();
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'alphabet-tracing', 'Alphabet Trail');
    this.adapter = new TraceAdapter(this.menu.root, actions);
    this.speech = new LetterSpeech(() => preferences.current.muted);
    this.render();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.adapter.destroy();
      this.speech.destroy();
      this.menu.destroy();
    });
  }

  update(time: number): void {
    if (this.leaving) return;
    if (time > this.speechCheck) {
      this.refreshSound();
      this.speechCheck = time + 1000;
    }
    if (actions.wasPressed('cancel')) {
      if (this.index === undefined) this.leave();
      else this.showLetters();
      return;
    }
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation, time);
    let input;
    while ((input = actions.consumeTrace())) {
      if (this.index === undefined || this.trace.complete) continue;
      const letter = LETTERS[this.index]!;
      const before = this.trace;
      this.trace = tracePoint(letter, before, input, input.phase);
      if (this.trace.complete) {
        this.completed.add(this.index);
        this.speech.name(letter.name);
        this.paintTrace();
        this.menu.root.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus();
        break;
      }
      if (this.trace.stroke !== before.stroke || !this.trace.drawing) this.speech.stopSound();
      else if (this.trace.distance > before.distance) this.speech.sound(letter.sound, time);
      this.paintTrace();
    }
  }

  private activate(id: string, time: number): void {
    if (id === 'library') return this.leave();
    if (id === 'letters') return this.showLetters();
    if (id === 'mute') {
      preferences.toggleMute();
      this.refreshSound();
      if (!preferences.current.muted && this.index !== undefined)
        this.speech.name(LETTERS[this.index]!.name);
      return;
    }
    if (id === 'hear' && this.index !== undefined) {
      this.speech.name(LETTERS[this.index]!.name);
      return;
    }
    if (id === 'sound' && this.index !== undefined) {
      this.speech.sound(LETTERS[this.index]!.sound, time);
      return;
    }
    let selected: number | undefined;
    if (id.startsWith('letter:')) selected = Number(id.slice(7));
    if (id === 'next' && this.index !== undefined && this.trace.complete)
      selected = nextLetterIndex(this.index);
    if (id === 'retry' && this.index !== undefined) selected = this.index;
    if (selected !== undefined && Number.isInteger(selected) && LETTERS[selected]) {
      this.index = selected;
      this.trace = startTrace();
      this.adapter.reset();
      this.speech.name(LETTERS[selected]!.name);
      this.render();
      this.menu.root.querySelector<SVGSVGElement>('[data-trace-surface]')?.focus();
    }
  }

  private render(): void {
    const letter = this.index === undefined ? undefined : LETTERS[this.index];
    this.menu.setContent(`
      <header class="at-header"><div class="at-brand"><span class="at-logo">${pencil}</span><span>Alphabet<span class="at-brand-light"> Trail</span></span></div>
      <nav aria-label="Game options">${button('mute', '', 'aria-pressed="false"')}${button('library', 'All games ↗')}</nav></header>
      ${
        letter
          ? `
        <div class="at-trace-heading"><div>${button('letters', '← Back to letters', 'class="at-back"')}<h1>Let’s trace <span>${letter.letter}</span></h1></div><span class="at-page-number">${this.index! + 1} <span>/ 26 letters</span></span></div>
        <main class="at-workspace">
          <aside class="at-instructions"><span class="at-eyebrow">A LITTLE LETTER PRACTICE</span><h2>Follow the trail.</h2><p>Start at the numbered dot.<br>Trace in the arrow’s direction.</p>
          <div class="at-sound-card"><span class="at-sample-letter">${letter.letter}</span><div><span>Listen as you trace</span><strong>“${letter.sound}”</strong><small>${letter.letter === 'X' ? 'Like the x in' : 'As in'} ${letter.example}</small></div></div>
          <div class="at-listen">${button('hear', '◖)) Letter name')}${button('sound', '◖)) Letter sound')}</div>
          <p class="at-audio-note" data-audio-note></p>
          <div class="at-stroke-status"><span data-stroke-label></span><div class="at-stroke-dots" data-strokes></div></div>
          ${button('retry', '↻ Start again', 'class="at-retry"')}</aside>
          <section class="at-paper" aria-label="Letter tracing practice"><div class="at-paper-caption"><span>YOUR TRACING PAPER</span><span>Finger, stylus, or mouse</span></div>
          <svg data-trace-surface viewBox="0 0 400 400" tabindex="0" role="img" aria-label="Trace uppercase ${letter.letter}. Follow the numbered dot and arrow. Resuming at the dot keeps your progress.">
            <defs><marker id="at-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="#24564a" stroke-width="2" stroke-linejoin="round"/></marker></defs>
            <g class="at-writing-lines" aria-hidden="true"><path d="M30 75H370M30 325H370"/><path d="M30 200H370" stroke-dasharray="5 7"/></g>
            <g fill="none" stroke-linecap="round" stroke-linejoin="round">${letter.strokes
              .map((points) => {
                const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
                return `<path d="${path}" stroke="#b3beb2" stroke-width="48"/><path d="${path}" stroke="#fffdf5" stroke-width="43"/>`;
              })
              .join('')}
            ${letter.strokes.map((points, i) => `<path data-ink="${i}" d="${points.map((p, j) => `${j ? 'L' : 'M'}${p.x},${p.y}`).join(' ')}" stroke="#75b8a0" stroke-width="43"/>`).join('')}
            <path data-guide stroke="#708b73" stroke-width="2" stroke-dasharray="3 7"/>
            <path data-direction stroke="#24564a" stroke-width="3" marker-end="url(#at-arrow)"/>
            </g><g data-start aria-hidden="true"><circle r="17" fill="#24564a" stroke="#fffdf5" stroke-width="3"/><text text-anchor="middle" y="6" fill="white" font-size="17" font-weight="bold" data-start-number></text></g>
          </svg>
          <p class="at-feedback" data-feedback role="status" aria-live="polite"></p>
          <section class="at-complete" data-complete hidden aria-label="Letter complete"><span class="at-complete-mark">✓</span><h2>You traced ${letter.letter}!</h2><p>A lovely letter, made by you.</p><div>${button('next', `Next letter: ${LETTERS[nextLetterIndex(this.index!)]!.letter} →`, 'class="at-primary"')}${button('letters', 'Back to letters')}</div></section>
          </section>
        </main>`
          : `
        <main class="at-picker"><div class="at-intro"><span class="at-eyebrow">LITTLE HANDS. BIG DISCOVERIES.</span><h1>Every letter is<br>a little adventure.</h1><p>Pick a letter. Hear its sound.<br>Then follow the trail to make it yours.</p></div>
        <div class="at-picker-art" aria-hidden="true"><span>A</span><span>B</span><span>C</span><svg viewBox="0 0 100 100"><path d="M15 80Q35 20 80 15Q80 65 15 80" fill="#a7c6a5"/><path d="M15 80 65 35" stroke="#49765e" stroke-width="3"/></svg></div>
        <section class="at-letters-section" aria-label="Choose a letter"><div class="at-grid-heading"><h2>Which letter shall we try?</h2><span>26 letters to explore</span></div><div class="at-letter-grid">${LETTERS.map((entry, i) => button(`letter:${i}`, `${entry.letter}${this.completed.has(i) ? '<small aria-hidden="true">✓</small>' : ''}`, `class="at-letter at-color-${i % 4}" aria-label="Trace ${entry.letter}${this.completed.has(i) ? ', practiced' : ''}"`)).join('')}</div></section>
        <footer class="at-footer"><span>✦ A little practice, at your own pace.</span><span>Look · Listen · Trace</span></footer></main>`
      }`);
    this.refreshSound();
    if (letter) this.paintTrace();
  }

  private paintTrace(): void {
    if (this.index === undefined) return;
    const letter = LETTERS[this.index]!;
    const complete = this.trace.complete;
    letter.strokes.forEach((points, i) => {
      const length = strokeLength(points);
      const ink = this.menu.root.querySelector<SVGPathElement>(`[data-ink="${i}"]`)!;
      const filled =
        i < this.trace.stroke ? length : i === this.trace.stroke ? this.trace.distance : 0;
      ink.setAttribute('stroke-dasharray', `${filled} ${length + 1}`);
      ink.style.visibility = filled ? 'visible' : 'hidden';
    });
    for (const selector of ['[data-start]', '[data-guide]', '[data-direction]'])
      this.menu.root.querySelector(selector)?.toggleAttribute('hidden', complete);
    if (!complete) {
      const points = letter.strokes[this.trace.stroke]!;
      const current = pointAt(points, this.trace.distance);
      const ahead = pointAt(points, this.trace.distance + 43);
      this.menu.root
        .querySelector('[data-start]')
        ?.setAttribute('transform', `translate(${current.x} ${current.y})`);
      this.setText('[data-start-number]', String(this.trace.stroke + 1));
      this.menu.root
        .querySelector('[data-guide]')
        ?.setAttribute('d', points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '));
      this.menu.root
        .querySelector('[data-direction]')
        ?.setAttribute('d', `M${current.x},${current.y} L${ahead.x},${ahead.y}`);
    }
    this.setText(
      '[data-stroke-label]',
      complete
        ? 'All strokes complete ✓'
        : `Stroke ${this.trace.stroke + 1} of ${letter.strokes.length}`,
    );
    const dots = this.menu.root.querySelector('[data-strokes]')!;
    dots.innerHTML = letter.strokes
      .map(
        (_, i) =>
          `<span class="${i < this.trace.stroke ? 'done' : i === this.trace.stroke ? 'current' : ''}">${i < this.trace.stroke ? '✓' : i + 1}</span>`,
      )
      .join('');
    this.setText(
      '[data-feedback]',
      complete
        ? `Well done! This is ${letter.letter}.`
        : this.trace.drawing
          ? 'That’s it. Follow the trail!'
          : this.trace.distance > 0
            ? 'Keep going from the numbered dot.'
            : `Start at dot ${this.trace.stroke + 1}. Take your time.`,
    );
    this.menu.root.querySelector('[data-complete]')?.toggleAttribute('hidden', !complete);
    this.menu.refreshButtons();
  }

  private refreshSound(): void {
    this.setText(
      '[data-action="mute"]',
      preferences.current.muted ? '◖× Sound off' : '◖)) Sound on',
    );
    this.menu.root
      .querySelector('[data-action="mute"]')
      ?.setAttribute('aria-pressed', String(preferences.current.muted));
    this.setText(
      '[data-audio-note]',
      this.speech.available
        ? ''
        : 'For spoken letters, enable an installed English voice on your device.',
    );
  }

  private setText(selector: string, text: string): void {
    const element = this.menu.root.querySelector(selector);
    if (element && element.textContent !== text) element.textContent = text;
  }

  private showLetters(): void {
    const previous = this.index;
    this.adapter.reset();
    this.speech.stop();
    this.index = undefined;
    this.render();
    if (previous !== undefined)
      this.menu.root
        .querySelector<HTMLButtonElement>(`[data-action="letter:${previous}"]`)
        ?.focus();
  }

  private leave(): void {
    this.leaving = true;
    this.adapter.reset();
    this.speech.stop();
    goToScene(this, 'GameHub');
  }
}
