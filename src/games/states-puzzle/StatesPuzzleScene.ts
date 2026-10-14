import Phaser from 'phaser';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { MapPlacementAdapter } from '../../input/MapPlacementAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import { getState, STATES, type StateShape } from './data';
import { createStatesPuzzle, placeState, stateAtPoint, type StatesPuzzle } from './rules';
import credits from './CREDITS.md?raw';
import './style.css';

const button = (action: string, label: string, extra = ''): string =>
  `<button type="button" data-action="${action}" ${extra}>${label}</button>`;
const FULL_MAP = '-65 0 1040 640';

export class StatesPuzzleScene extends Phaser.Scene {
  private puzzle: StatesPuzzle = createStatesPuzzle();
  private menu!: ActionMenu;
  private adapter!: MapPlacementAdapter;
  private zoomed = false;
  private hinted = false;
  private leaving = false;
  private namedSlots = false;

  constructor() {
    super('StatesPuzzle');
  }

  create(): void {
    this.puzzle = createStatesPuzzle();
    this.zoomed = false;
    this.hinted = false;
    this.leaving = false;
    this.namedSlots = false;
    this.menu = new ActionMenu(actions, 'states-puzzle', 'United States Puzzle');
    this.menu.setContent(`
      <header class="states-header">
        <div><span class="states-eyebrow">LITTLE GAMES / GEOGRAPHY</span><h1>United States Puzzle</h1></div>
        <nav aria-label="Game controls">${button('mute', 'Sound on')}${button('library', 'Game Library')}</nav>
      </header>
      <div class="states-layout">
        <aside class="states-toolbox" aria-label="State toolbox">
          <span class="states-eyebrow">YOUR TOOLBOX</span><h2>Where does it fit?</h2>
          <p>Drag your state onto its outline.<br>Or tap an outline to place it.</p>
          <div data-toolbox></div>
          <div class="states-tools">${button('hint', 'Show a hint')}${button('hear', 'Hear state name')}</div>
          <div class="states-progress"><span data-progress></span><progress max="50" value="0" aria-label="States placed"></progress></div>
          <p class="states-feedback" role="status" aria-live="polite" data-feedback>Every state has a place. Take your time!</p>
        </aside>
        <div class="states-map-panel">
          <div class="states-map-heading"><div><span class="states-eyebrow">BUILD THE MAP</span><h2 data-map-heading>50 states, one country.</h2></div>${button('zoom', 'Closer view')}</div>
          <svg class="states-map" data-placement-map viewBox="${FULL_MAP}" aria-label="Map of the United States with state-shaped slots">
            <g>${STATES.map((state) => `<path data-state="${state.id}" d="${state.path}" fill-rule="evenodd" class="state-slot"><title>${state.name} slot</title></path>`).join('')}</g>
            <g class="states-map-labels" aria-hidden="true">${STATES.map((state) => `<text data-label="${state.id}" x="${state.center.x}" y="${state.center.y}" hidden>${state.abbreviation}</text>`).join('')}</g>
            <path data-hint-shape class="state-hint" fill-rule="evenodd" hidden></path>
            <g data-hint-marker hidden aria-hidden="true"><circle r="15"></circle><text y="5">?</text></g>
          </svg>
          <div class="states-map-caption"><span>Alaska &amp; Hawaii are shown in insets.</span><span>Outlines → colorful states</span></div>
          <section class="states-slot-picker">${button('slots', 'Choose a slot by name', 'aria-expanded="false" aria-controls="states-named-slots"')}<div id="states-named-slots" hidden><p>Choose the name of the slot for your piece.</p><div data-slot-choices></div></div></section>
          <details class="states-credits"><summary>Map credits</summary><pre>${credits}</pre></details>
        </div>
      </div>
      <section class="states-completion" data-completion hidden aria-label="Puzzle complete">
        <span class="states-eyebrow">ALL THE PIECES FIT</span><h2>You built the United States!</h2><p>All 50 states have found their place.</p>
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
    if (placement)
      this.place(
        placement.pieceId,
        stateAtPoint(placement, placement.pieceId, placement.tolerance),
      );
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
  }

  private activate(id: string): void {
    const current = getState(this.puzzle.current ?? '');
    if (id === 'library') this.leave();
    else if (id === 'replay') this.scene.restart();
    else if (id === 'mute') {
      preferences.toggleMute();
      if (preferences.current.muted) stopSpeaking();
      this.refreshMute();
    } else if (id === 'zoom') {
      this.zoomed = !this.zoomed;
      this.refreshMapView(current);
    } else if (id === 'slots') {
      this.namedSlots = !this.namedSlots;
      this.menu.root
        .querySelector('#states-named-slots')
        ?.toggleAttribute('hidden', !this.namedSlots);
      this.menu.root
        .querySelector('[data-action="slots"]')
        ?.setAttribute('aria-expanded', String(this.namedSlots));
      this.menu.refreshButtons();
    } else if (id === 'hint' && current) {
      this.hinted = true;
      this.showHint(current);
      this.setText(
        '[data-feedback]',
        `Find the outline with the question mark for ${current.name}.`,
      );
    } else if ((id === 'hear' || id === 'piece') && current) {
      speak(current.name, preferences.current.muted);
      if (id === 'piece')
        this.setText('[data-feedback]', `${current.name} is ready. Tap its matching outline.`);
    } else if (id.startsWith('slot:') && current) this.place(current.id, id.slice(5));
  }

  private place(pieceId: string, slotId: string | undefined): void {
    const result = placeState(this.puzzle, pieceId, slotId);
    this.setText('[data-feedback]', result.message);
    this.puzzle = result.puzzle;
    if (!result.correct) return;
    this.hinted = false;
    this.zoomed = false;
    playPlacementTone(preferences.current.muted);
    this.refresh();
    const next = getState(this.puzzle.current ?? '');
    if (next) this.setText('[data-feedback]', `${result.message} Next piece: ${next.name}.`);
    if (result.assisted && next)
      speak(`${result.message} Next piece: ${next.name}.`, preferences.current.muted);
    if (next && this.namedSlots)
      this.menu.root.querySelector<HTMLButtonElement>('[data-action="slots"]')?.focus();
    if (this.puzzle.complete) {
      speak('You built the United States! All fifty states fit.', preferences.current.muted);
      this.menu.root.querySelector<HTMLButtonElement>('[data-action="replay"]')?.focus();
    }
  }

  private refresh(): void {
    const current = getState(this.puzzle.current ?? '');
    const toolbox = this.menu.root.querySelector('[data-toolbox]');
    if (toolbox)
      toolbox.innerHTML = current
        ? this.pieceArt(current)
        : '<div class="states-done">✓<strong>Every state placed!</strong></div>';
    for (const shape of STATES) {
      const placed = this.puzzle.placed.includes(shape.id);
      const slot = this.menu.root.querySelector(`[data-state="${shape.id}"]`);
      slot?.setAttribute('fill', placed ? shape.color : '#f7f4e9');
      slot?.setAttribute('aria-label', `${shape.name}${placed ? ', placed' : ', empty slot'}`);
      this.menu.root
        .querySelector(`[data-label="${shape.id}"]`)
        ?.toggleAttribute('hidden', !placed);
    }
    const map = this.menu.root.querySelector<SVGSVGElement>('[data-placement-map]');
    if (map) map.dataset.currentPiece = current?.id ?? '';
    if (!current) this.zoomed = false;
    this.refreshMapView(current);
    this.showHint(undefined);
    this.setText('[data-progress]', `${this.puzzle.placed.length} / 50 states placed`);
    const meter = this.menu.root.querySelector('progress');
    if (meter) meter.value = this.puzzle.placed.length;
    const choices = this.menu.root.querySelector('[data-slot-choices]');
    if (choices)
      choices.innerHTML = STATES.filter(({ id }) => !this.puzzle.placed.includes(id))
        .map(({ id, name }) => button(`slot:${id}`, name))
        .join('');
    for (const id of ['hint', 'hear']) {
      const control = this.menu.root.querySelector<HTMLButtonElement>(`[data-action="${id}"]`);
      if (control) control.disabled = !current;
    }
    this.menu.root
      .querySelector('[data-completion]')
      ?.toggleAttribute('hidden', !this.puzzle.complete);
    this.menu.refreshButtons();
    this.refreshMute();
    if (current) speak(current.name, preferences.current.muted);
  }

  private refreshMapView(current: StateShape | undefined): void {
    const map = this.menu.root.querySelector('[data-placement-map]');
    const labels = this.menu.root.querySelector<SVGGElement>('.states-map-labels');
    if (this.zoomed && current) {
      const { x, y, width, height } = current.bounds;
      const size = Math.max(width, height) * 2.1 + 12;
      map?.setAttribute(
        'viewBox',
        `${x + width / 2 - size / 2} ${y + height / 2 - size / 2} ${size} ${size}`,
      );
      if (labels) labels.style.fontSize = `${size / 32}px`;
    } else {
      map?.setAttribute('viewBox', FULL_MAP);
      if (labels) labels.style.fontSize = '12px';
    }
    this.setText('[data-action="zoom"]', this.zoomed ? 'Whole map' : 'Closer view');
    this.setText(
      '[data-map-heading]',
      this.zoomed && current ? `A closer look: ${current.name}` : '50 states, one country.',
    );
    if (this.hinted) this.showHint(current);
  }

  private showHint(shape: StateShape | undefined): void {
    const outline = this.menu.root.querySelector('[data-hint-shape]');
    outline?.toggleAttribute('hidden', !shape);
    if (shape) outline?.setAttribute('d', shape.path);
    const marker = this.menu.root.querySelector('[data-hint-marker]');
    marker?.toggleAttribute('hidden', !shape);
    if (shape) {
      const scale = this.zoomed ? Math.max(shape.bounds.width, shape.bounds.height) / 160 : 1;
      marker?.setAttribute(
        'transform',
        `translate(${shape.center.x} ${shape.center.y}) scale(${scale})`,
      );
    }
  }

  private pieceArt(shape: StateShape): string {
    const { x, y, width, height } = shape.bounds;
    return `<button type="button" class="states-piece" data-action="piece" data-piece="${shape.id}" aria-label="${shape.name} puzzle piece. Drag to its outline, or tap a slot.">
      <svg viewBox="${x - 8} ${y - 8} ${width + 16} ${height + 16}" aria-hidden="true"><path d="${shape.path}" fill="${shape.color}" stroke="#263f48" stroke-width="2" vector-effect="non-scaling-stroke" fill-rule="evenodd"/></svg>
      <strong>${shape.name}</strong><span>${shape.abbreviation} · Drag me to the map</span></button>`;
  }

  private refreshMute(): void {
    const muted = preferences.current.muted;
    this.setText('[data-action="mute"]', muted ? 'Sound off' : 'Sound on');
    this.menu.root
      .querySelector('[data-action="mute"]')
      ?.setAttribute('aria-pressed', String(muted));
  }

  private setText(selector: string, text: string): void {
    const element = this.menu.root.querySelector(selector);
    if (element) element.textContent = text;
  }

  private leave(): void {
    this.leaving = true;
    this.menu.root.style.pointerEvents = 'none';
    goToScene(this, 'GameHub');
  }
}
