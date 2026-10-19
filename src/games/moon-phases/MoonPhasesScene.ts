import Phaser from 'phaser';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { MapPlacementAdapter } from '../../input/MapPlacementAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import { earthArt, moonArt, moonIcon } from './art';
import {
  createMoonPuzzle,
  getMoonPhase,
  MOON_PHASES,
  moonSlot,
  moonSlotAtPoint,
  placeMoonPhase,
  type MoonPuzzle,
} from './rules';
import './style.css';

const button = (action: string, label: string, extra = ''): string =>
  `<button type="button" data-action="${action}" ${extra}>${label}</button>`;

export class MoonPhasesScene extends Phaser.Scene {
  private puzzle: MoonPuzzle = createMoonPuzzle();
  private menu!: ActionMenu;
  private adapter!: MapPlacementAdapter;
  private hints = false;
  private namedSlots = false;
  private leaving = false;

  constructor() {
    super('MoonPhases');
  }

  create(): void {
    this.puzzle = createMoonPuzzle();
    this.hints = false;
    this.namedSlots = false;
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'moon-phases', 'Moon Phases Puzzle');
    this.menu.setContent(`
      <header class="moon-header">
        <div><p class="moon-eyebrow">LITTLE GAMES / OUR NIGHT SKY</p><h1>Moon Phases Puzzle</h1></div>
        <nav aria-label="Game controls">${button('mute', 'Sound on')}${button('library', 'Game Library')}</nav>
      </header>
      <div class="moon-layout">
        <aside class="moon-tray" aria-label="Moon piece tray">
          <p class="moon-eyebrow">YOUR MOON PIECE</p><h2>Find its place</h2>
          <p>Drag the Moon to its named spot.<br>Or tap the spot to place it.</p>
          <div data-piece-tray></div>
          ${button('hint', 'Show picture hints', 'aria-pressed="false"')}
          ${button('hear', 'Hear phase name')}
          <div><p data-progress></p><progress value="0" max="8" aria-label="Moon phases placed"></progress></div>
          <p class="moon-feedback" data-feedback role="status" aria-live="polite">Take your time. Every phase has a place!</p>
        </aside>
        <section class="moon-board" aria-label="Moon cycle puzzle">
          <h2>One Moon, eight familiar shapes</h2>
          <p>Follow the phases around Earth, starting with New Moon on the left.</p>
          <div class="moon-map-scroll"><svg class="moon-map" data-placement-map viewBox="0 0 1200 900" role="img" aria-label="Eight named moon phase slots around Earth: New Moon left, waxing phases below, Full Moon right, and waning phases above">
            ${earthArt()}
            ${MOON_PHASES.map((phase, index) => {
              const { x, y } = moonSlot(index);
              const side = x < 500 ? -1 : x > 700 ? 1 : 0;
              const labelX = side * 92;
              const labelY = side ? -8 : y < 450 ? -112 : 109;
              const anchor = side < 0 ? 'end' : side > 0 ? 'start' : 'middle';
              return `<g transform="translate(${x} ${y})" data-slot="${phase.id}">
                <circle r="78" class="moon-slot"/>
                <g transform="scale(1.5)" data-moon="${phase.id}" hidden>${moonArt(phase.id)}</g>
                <circle r="65" class="moon-empty" data-empty="${phase.id}"/>
                <text y="12" class="moon-question" data-question="${phase.id}">?</text>
                <text x="${labelX}" y="${labelY}" class="moon-name" style="text-anchor:${anchor}">${index + 1}. ${phase.lines[0]}<tspan x="${labelX}" dy="30">${phase.lines[1]}</tspan></text>
                <text x="59" y="-55" class="moon-check" data-check="${phase.id}" hidden>✓</text>
              </g>`;
            }).join('')}
          </svg></div>
          <p class="moon-note">Waxing means growing brighter. Waning means growing darker.<br>Illustrations show the view from the Northern Hemisphere. The cycle takes about 29½ days.</p>
          <p class="moon-credit">Earth texture: NASA Earth Observatory / Blue Marble. Diagram sizes and spacing are simplified.</p>
          <section class="moon-slot-picker">${button('slots', 'Choose a spot by name', 'aria-expanded="false" aria-controls="moon-named-slots"')}<div id="moon-named-slots" data-named-slots hidden></div></section>
        </section>
      </div>
      <section class="moon-complete" data-completion hidden aria-label="Puzzle complete">
        <p class="moon-eyebrow">A WHOLE MOON CYCLE</p><h2>You matched every phase!</h2>
        <p>The Sun always lights half the Moon. As the Moon orbits Earth, we see different amounts of that bright half.</p>
        ${button('replay', 'Play again')}${button('library', 'Game Library')}
      </section>`);
    this.adapter = new MapPlacementAdapter(this.menu.root, actions);
    this.refresh();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.adapter.destroy();
      this.menu.destroy();
      stopSpeaking();
    });
  }

  update(): void {
    if (this.leaving) return;
    if (actions.wasPressed('cancel')) {
      this.leave();
      return;
    }
    const placement = actions.consumePlacement();
    if (placement) this.place(placement.pieceId, moonSlotAtPoint(placement, placement.tolerance));
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
  }

  private activate(id: string): void {
    const phase = getMoonPhase(this.puzzle.current ?? '');
    if (id === 'library') this.leave();
    else if (id === 'replay') this.scene.restart();
    else if (id === 'mute') {
      preferences.toggleMute();
      if (preferences.current.muted) stopSpeaking();
      this.refreshMute();
    } else if (id === 'hint') {
      this.hints = !this.hints;
      this.refreshBoard();
    } else if (id === 'slots') {
      this.namedSlots = !this.namedSlots;
      this.menu.root
        .querySelector('[data-named-slots]')
        ?.toggleAttribute('hidden', !this.namedSlots);
      this.menu.root
        .querySelector('[data-action="slots"]')
        ?.setAttribute('aria-expanded', String(this.namedSlots));
      this.menu.refreshButtons();
    } else if ((id === 'hear' || id === 'piece') && phase) {
      speak(`${phase.name}. ${phase.fact}`, preferences.current.muted);
    } else if (id.startsWith('slot:') && phase) this.place(phase.id, id.slice(5));
  }

  private place(pieceId: string, slotId: string | undefined): void {
    const result = placeMoonPhase(this.puzzle, pieceId, slotId);
    this.setText('[data-feedback]', result.message);
    if (!result.correct) return;
    this.puzzle = result.puzzle;
    playPlacementTone(preferences.current.muted);
    this.refresh();
    if (this.namedSlots && !this.puzzle.complete)
      this.menu.root.querySelector<HTMLButtonElement>('[data-action="slots"]')?.focus();
    if (this.puzzle.complete) {
      speak(result.message, preferences.current.muted);
      this.menu.root.querySelector<HTMLButtonElement>('[data-action="replay"]')?.focus();
    }
  }

  private refresh(): void {
    const phase = getMoonPhase(this.puzzle.current ?? '');
    const tray = this.menu.root.querySelector('[data-piece-tray]');
    if (tray)
      tray.innerHTML = phase
        ? `<div class="moon-piece-display"><button type="button" class="moon-piece" data-action="piece" data-piece="${phase.id}" aria-label="${phase.name} piece. Drag to its named spot, or tap a spot." aria-describedby="moon-piece-name moon-piece-help">${moonIcon(phase.id)}</button><strong id="moon-piece-name">${phase.name}</strong><span id="moon-piece-help">Drag me to my spot</span></div>`
        : '<p class="moon-done">✓ All eight phases placed!</p>';
    const map = this.menu.root.querySelector<SVGSVGElement>('[data-placement-map]');
    if (map) map.dataset.currentPiece = phase?.id ?? '';
    this.setText('[data-progress]', `${this.puzzle.placed.length} / 8 phases placed`);
    const progress = this.menu.root.querySelector('progress');
    if (progress) progress.value = this.puzzle.placed.length;
    const choices = this.menu.root.querySelector('[data-named-slots]');
    if (choices)
      choices.innerHTML = MOON_PHASES.map(({ id, name }, index) =>
        button(
          `slot:${id}`,
          `${index + 1}. ${name}${this.puzzle.placed.includes(id) ? ' ✓' : ''}`,
          this.puzzle.placed.includes(id) || !phase ? 'disabled' : '',
        ),
      ).join('');
    for (const action of ['hint', 'hear']) {
      const control = this.menu.root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
      if (control) control.disabled = !phase;
    }
    this.menu.root
      .querySelector('[data-completion]')
      ?.toggleAttribute('hidden', !this.puzzle.complete);
    this.refreshBoard();
    this.refreshMute();
    this.menu.refreshButtons();
  }

  private refreshBoard(): void {
    for (const { id, name } of MOON_PHASES) {
      const placed = this.puzzle.placed.includes(id);
      this.menu.root.querySelector(`[data-slot="${id}"]`)?.classList.toggle('is-placed', placed);
      this.menu.root
        .querySelector(`[data-slot="${id}"]`)
        ?.setAttribute('aria-label', `${name}, ${placed ? 'placed' : 'empty spot'}`);
      this.menu.root
        .querySelector(`[data-moon="${id}"]`)
        ?.toggleAttribute('hidden', !(placed || this.hints));
      this.menu.root
        .querySelector(`[data-empty="${id}"]`)
        ?.toggleAttribute('hidden', placed || this.hints);
      this.menu.root
        .querySelector(`[data-question="${id}"]`)
        ?.toggleAttribute('hidden', placed || this.hints);
      this.menu.root.querySelector(`[data-check="${id}"]`)?.toggleAttribute('hidden', !placed);
    }
    this.setText('[data-action="hint"]', this.hints ? 'Hide picture hints' : 'Show picture hints');
    this.menu.root
      .querySelector('[data-action="hint"]')
      ?.setAttribute('aria-pressed', String(this.hints));
  }

  private refreshMute(): void {
    this.setText('[data-action="mute"]', preferences.current.muted ? 'Sound off' : 'Sound on');
    this.menu.root
      .querySelector('[data-action="mute"]')
      ?.setAttribute('aria-pressed', String(preferences.current.muted));
  }

  private setText(selector: string, value: string): void {
    const element = this.menu.root.querySelector(selector);
    if (element) element.textContent = value;
  }

  private leave(): void {
    this.leaving = true;
    this.menu.root.style.pointerEvents = 'none';
    goToScene(this, 'GameHub');
  }
}
