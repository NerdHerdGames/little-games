import Phaser from 'phaser';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { OrbitGestureAdapter } from '../../input/OrbitGestureAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import type { MoonSystemView } from './MoonSystemView';
import {
  advanceExplorer,
  changeView,
  createExplorer,
  moveView,
  selectedMoon,
  stepMoons,
  type ExplorerState,
  type ViewTarget,
} from './rules';
import {
  CATALOGUE_DATE,
  getSystem,
  isSystemId,
  MOON_SYSTEMS,
  moonFact,
  moonPage,
  MOONS_PER_PAGE,
  systemFact,
  type MoonSystem,
} from './systems';
import './style.css';

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
const button = (action: string, label: string, className = ''): string =>
  `<button type="button" data-action="${action}" class="${className}">${escapeHtml(label)}</button>`;

export class MoonExplorerScene extends Phaser.Scene {
  private state: ExplorerState = createExplorer();
  private system: MoonSystem = getSystem('earth');
  private mode: 'picker' | 'view' = 'picker';
  private menu!: ActionMenu;
  private gestures: OrbitGestureAdapter | undefined;
  private view: MoonSystemView | undefined;
  private host: HTMLElement | undefined;
  private ready = false;
  private fallback = false;
  private leaving = false;
  private generation = 0;
  private page = 0;
  private frameSeconds = 0;
  private dirty = true;

  constructor() {
    super('MoonExplorer');
  }

  create(): void {
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'earth-moon-explorer', 'Moon Explorer');
    this.showPicker();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeView();
      this.menu.destroy();
      stopSpeaking();
    });
  }

  update(_time: number, delta: number): void {
    if (this.leaving || document.hidden) return;
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
    if (actions.wasPressed('cancel')) {
      if (this.mode === 'view') this.showPicker();
      else this.leave();
    }
    if (this.mode !== 'view') return;
    if (actions.wasPressed('pause')) this.activate('play');
    const gesture = actions.consumeViewGesture();
    if (gesture) {
      this.state = moveView(this.state, gesture);
      this.dirty = true;
    }
    if (!this.ready || this.leaving) return;
    this.frameSeconds += Math.min(delta, 100) / 1000;
    if (this.frameSeconds < 1 / 30 && !this.dirty && !this.view?.needsRender) return;
    const next = advanceExplorer(
      this.state,
      this.frameSeconds,
      preferences.current.reducedMotion || this.fallback,
    );
    this.frameSeconds = 0;
    if (next !== this.state) this.dirty = true;
    this.state = next;
    if (this.dirty || this.view?.needsRender) {
      if (this.fallback) this.paintFallback();
      else this.view?.render(this.state);
      this.dirty = false;
    }
  }

  private header(): string {
    return `<header class="earth-moon-header"><div><span class="earth-moon-eyebrow">LITTLE GAMES / SPACE LAB</span><h1>Moon Explorer</h1></div><nav aria-label="Game options">${this.mode === 'view' ? button('worlds', 'Worlds') : ''}${button('mute', 'Sound on')}${button('motion', 'Gentle motion')}${button('library', 'Games')}</nav></header>`;
  }

  private showPicker(): void {
    this.closeView();
    this.mode = 'picker';
    this.menu.setContent(
      `${this.header()}<div class="moon-picker"><span class="earth-moon-eyebrow">TEN WORLDS TO EXPLORE</span><h2>Whose moons shall we visit?</h2><p>Pick a planet or dwarf planet. Its whole moon family is waiting.</p><div class="moon-world-grid">${MOON_SYSTEMS.map((system) => `<button type="button" data-action="world:${system.id}" class="moon-world"><img src="${import.meta.env.BASE_URL}${system.spritePath}" alt=""/><strong>${escapeHtml(system.name)}</strong><span>${system.moons.length} ${system.moons.length === 1 ? 'moon' : 'moons'} · ${system.dwarf ? 'Dwarf planet' : 'Planet'}</span></button>`).join('')}</div><p class="moon-picker-note">Mercury, Venus, and Ceres have no known moons.<br/>Moon catalogue checked ${CATALOGUE_DATE}. New discoveries can change the counts.</p></div>`,
    );
    this.refreshUi();
  }

  private openSystem(system: MoonSystem): void {
    this.closeView();
    this.system = system;
    this.mode = 'view';
    this.state = createExplorer();
    this.page = 0;
    this.ready = false;
    this.fallback = false;
    this.frameSeconds = 0;
    this.dirty = true;
    this.menu.setContent(
      `${this.header()}<div class="earth-moon-layout"><div class="earth-moon-stage"><div data-view class="earth-moon-view"></div><div class="earth-moon-view-heading"><span class="earth-moon-eyebrow" data-system-count></span><strong data-view-title></strong></div><p data-load-status class="earth-moon-load-status" role="status">Getting ${escapeHtml(system.name)} and its moons ready…</p><div class="earth-moon-stage-footer"><p data-view-help>Drag to turn · Pinch to zoom</p><div class="earth-moon-tools">${button('zoom:out', '− Zoom out')}${button('zoom:in', '+ Zoom in')}${button('reset', 'Reset view')}</div></div></div><aside class="earth-moon-panel" aria-label="Explore ${escapeHtml(system.name)} and its moons"><div class="earth-moon-targets moon-system-targets">${button('view:system', 'All together')}${button('view:planet', system.name)}</div><div class="earth-moon-fact-card" aria-live="polite"><h3 data-fact-title></h3><p data-fact-detail></p><p class="moon-surface-note" data-surface-note></p>${button('read', 'Read to me', 'earth-moon-read')}</div><section class="moon-catalogue" aria-label="All moons"><div class="moon-catalogue-heading"><h2>Meet the moons</h2><span data-catalogue-count></span></div><div data-moon-list class="moon-list"></div><div class="moon-page-controls">${button('moons:previous', '← Previous')}${button('moons:next', 'More moons →')}</div><p data-moon-page class="moon-page-label" role="status"></p></section><div class="earth-moon-motion-controls">${button('play', 'Pause motion')}${button('step', 'Move moons one step →')}${button('orbit', 'Hide orbit paths')}</div><span class="earth-moon-eyebrow">TURN YOUR VIEW</span><div class="earth-moon-turn-controls">${button('turn:left', '↶ Turn left')}${button('turn:right', '↷ Turn right')}${button('turn:up', '↑ Look up')}${button('turn:down', '↓ Look down')}</div><p class="earth-moon-scale-note">All ${system.moons.length} moons in this catalogue are loaded. Sizes are enlarged and orbits rearranged to help you see them. This is a space illustration, not a scale model.</p><p class="earth-moon-credits">Moon names: NASA / JPL. Catalogue: ${CATALOGUE_DATE}.<br/>Earth and Moon imagery: NASA. Other surfaces are generated illustrations.</p></aside></div>`,
    );
    this.host = this.menu.root.querySelector<HTMLElement>('[data-view]') ?? undefined;
    if (!this.host) throw new Error('Moon view container is missing.');
    this.gestures = new OrbitGestureAdapter(this.host, actions);
    this.refreshMoonList();
    this.refreshUi();
    void this.loadView(this.generation);
  }

  private async loadView(generation: number): Promise<void> {
    try {
      const { MoonSystemView } = await import('./MoonSystemView');
      if (generation !== this.generation || this.leaving || !this.host) return;
      const view = new MoonSystemView(this.host, this.system, () => {
        if (generation === this.generation && !this.leaving) this.showFallback();
      });
      this.view = view;
      await view.loadTextures();
      if (generation !== this.generation || this.leaving || this.fallback) return;
      this.ready = true;
      const status = this.menu.root.querySelector<HTMLElement>('[data-load-status]');
      if (status) status.hidden = true;
      this.dirty = true;
    } catch {
      if (generation === this.generation && !this.leaving) this.showFallback();
    }
  }

  private activate(action: string): void {
    if (action === 'library') return this.leave();
    if (action === 'worlds') return this.showPicker();
    if (action === 'mute') {
      preferences.toggleMute();
      if (preferences.current.muted) stopSpeaking();
    } else if (action === 'motion') preferences.toggleReducedMotion();
    else if (action.startsWith('world:') && isSystemId(action.slice(6))) {
      this.openSystem(getSystem(action.slice(6) as Parameters<typeof getSystem>[0]));
      return;
    } else if (this.mode === 'view') {
      if (action === 'play') this.state = { ...this.state, playing: !this.state.playing };
      else if (action === 'step') this.state = stepMoons(this.state);
      else if (action === 'orbit') this.state = { ...this.state, showOrbit: !this.state.showOrbit };
      else if (action === 'reset')
        this.state = changeView(this.state, this.state.target, this.system);
      else if (action === 'read') {
        const moon = selectedMoon(this.system, this.state);
        speak(
          moon ? moonFact(this.system, moon) : systemFact(this.system),
          preferences.current.muted,
        );
      } else if (action === 'moons:previous' || action === 'moons:next') {
        const pages = Math.ceil(this.system.moons.length / MOONS_PER_PAGE);
        this.page = (this.page + (action === 'moons:next' ? 1 : -1) + pages) % pages;
        this.refreshMoonList();
      } else if (action.startsWith('view:')) {
        this.state = changeView(this.state, action.slice(5) as ViewTarget, this.system);
        const moon = selectedMoon(this.system, this.state);
        speak(moon?.name ?? this.system.name, preferences.current.muted);
      } else if (action.startsWith('turn:') || action.startsWith('zoom:')) {
        this.state = moveView(this.state, {
          rotateX: action === 'turn:left' ? -0.22 : action === 'turn:right' ? 0.22 : 0,
          rotateY: action === 'turn:up' ? 0.15 : action === 'turn:down' ? -0.15 : 0,
          zoom: action === 'zoom:in' ? 0.15 : action === 'zoom:out' ? -0.15 : 0,
        });
      }
    }
    this.dirty = true;
    this.refreshUi();
  }

  private refreshMoonList(): void {
    const list = this.menu.root.querySelector<HTMLElement>('[data-moon-list]');
    if (list)
      list.innerHTML = moonPage(this.system, this.page)
        .map((moon) => button(`view:moon:${moon.id}`, moon.name, 'moon-choice'))
        .join('');
    this.setText('[data-catalogue-count]', `${this.system.moons.length} moons`);
    this.setText(
      '[data-moon-page]',
      `Page ${this.page + 1} of ${Math.ceil(this.system.moons.length / MOONS_PER_PAGE)} · Every moon is shown in the overview`,
    );
    const paging = this.menu.root.querySelector<HTMLElement>('.moon-page-controls');
    if (paging) paging.hidden = this.system.moons.length <= MOONS_PER_PAGE;
    this.menu.refreshButtons();
  }

  private refreshUi(): void {
    this.setText('[data-action="mute"]', preferences.current.muted ? 'Sound off' : 'Sound on');
    this.setText(
      '[data-action="motion"]',
      preferences.current.reducedMotion ? 'Still view' : 'Gentle motion',
    );
    if (this.mode !== 'view') return;
    const moon = selectedMoon(this.system, this.state);
    const title =
      moon?.name ??
      (this.state.target === 'system' ? `${this.system.name} and its moons` : this.system.name);
    this.setText(
      '[data-system-count]',
      `${this.system.name.toUpperCase()} / ${this.system.moons.length} ${this.system.moons.length === 1 ? 'MOON' : 'MOONS'}`,
    );
    this.setText('[data-view-title]', title);
    this.setText('[data-fact-title]', moon ? `Meet ${moon.name}` : title);
    this.setText(
      '[data-fact-detail]',
      moon ? moonFact(this.system, moon) : systemFact(this.system),
    );
    const nasa = this.system.id === 'earth';
    this.setText(
      '[data-surface-note]',
      this.fallback
        ? 'Illustrated picture view.'
        : nasa
          ? 'Surface imagery from NASA.'
          : 'Illustrated surface.',
    );
    this.setText('[data-action="play"]', this.state.playing ? 'Pause motion' : 'Resume motion');
    this.setText(
      '[data-action="orbit"]',
      this.state.showOrbit ? 'Hide orbit paths' : 'Show orbit paths',
    );
    this.setText(
      '[data-view-help]',
      preferences.current.reducedMotion
        ? 'Still view · Drag to turn or move moons one step'
        : 'Drag to turn · Pinch to zoom',
    );
    for (const choice of this.menu.root.querySelectorAll<HTMLButtonElement>(
      '[data-action^="view:"]',
    ))
      choice.setAttribute(
        'aria-pressed',
        String(choice.dataset.action === `view:${this.state.target}`),
      );
    if (this.fallback) this.paintFallback();
  }

  private showFallback(): void {
    if (this.fallback || !this.host) return;
    this.fallback = true;
    this.ready = true;
    this.view?.dispose();
    this.view = undefined;
    this.setText(
      '[data-load-status]',
      'Picture view — 3D could not start. You can still choose and learn about every moon.',
    );
    const status = this.menu.root.querySelector<HTMLElement>('[data-load-status]');
    if (status) status.hidden = false;
    this.host.innerHTML = '<div class="moon-picture-fallback" data-picture role="img"></div>';
    this.refreshUi();
    this.dirty = true;
  }

  private paintFallback(): void {
    const picture = this.host?.querySelector<HTMLElement>('[data-picture]');
    if (!picture) return;
    const moon = selectedMoon(this.system, this.state);
    picture.style.backgroundColor = moon
      ? '#bdb7ae'
      : `#${this.system.color.toString(16).padStart(6, '0')}`;
    picture.style.transform = `translate(-50%, -50%) scale(${this.state.zoom})`;
    picture.textContent = moon?.name ?? this.system.name;
    picture.setAttribute('aria-label', `${moon?.name ?? this.system.name}, illustrative picture`);
  }

  private setText(selector: string, text: string): void {
    const element = this.menu.root.querySelector(selector);
    if (element && element.textContent !== text) element.textContent = text;
  }
  private closeView(): void {
    this.generation += 1;
    this.gestures?.destroy();
    this.gestures = undefined;
    this.view?.dispose();
    this.view = undefined;
    this.host = undefined;
    this.ready = false;
    stopSpeaking();
    actions.clearViewGestures();
  }
  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.menu.root.style.pointerEvents = 'none';
    goToScene(this, 'GameHub');
  }
}
