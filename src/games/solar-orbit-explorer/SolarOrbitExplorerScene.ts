import Phaser from 'phaser';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { OrbitGestureAdapter } from '../../input/OrbitGestureAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import type { SolarOrbitView } from './SolarOrbitView';
import {
  advanceExplorer,
  changeView,
  createExplorer,
  moveView,
  stepPlanets,
  PLANETS,
  VIEW_TARGETS,
  isViewTarget,
  worldFacts,
  type ExplorerState,
} from './rules';
import { SolarSystemPictureView } from './SolarSystemPictureView';
import './style.css';

const button = (action: string, label: string, className = ''): string =>
  `<button type="button" data-action="${action}" class="${className}">${label}</button>`;

export class SolarOrbitExplorerScene extends Phaser.Scene {
  private state: ExplorerState = createExplorer();
  private menu!: ActionMenu;
  private gestures: OrbitGestureAdapter | undefined;
  private view: SolarOrbitView | SolarSystemPictureView | undefined;
  private host!: HTMLElement;
  private ready = false;
  private fallback = false;
  private leaving = false;
  private generation = 0;
  private frameSeconds = 0;
  private dirty = true;

  constructor() {
    super('SolarOrbitExplorer');
  }

  create(): void {
    this.state = createExplorer();
    this.ready = false;
    this.fallback = false;
    this.leaving = false;
    this.frameSeconds = 0;
    this.dirty = true;
    this.view = undefined;
    this.generation += 1;
    this.menu = new ActionMenu(actions, 'solar-orbit-explorer', 'Sun and Planet Explorer');
    this.menu.setContent(`
      <header class="solar-orbit-header">
        <div><span class="solar-orbit-eyebrow">LITTLE GAMES / SPACE LAB</span><h1>Sun &amp; Planet Explorer</h1></div>
        <nav aria-label="Game options">${button('mute', 'Sound on')}${button('motion', 'Gentle motion')}${button('library', 'Games')}</nav>
      </header>
      <div class="solar-orbit-layout">
        <div class="solar-orbit-stage">
          <div data-view class="solar-orbit-view"></div>
          <div class="solar-orbit-view-heading"><span class="solar-orbit-eyebrow">A CLOSER LOOK AT SPACE</span><strong data-view-title>Our solar system</strong></div>
          <p data-load-status class="solar-orbit-load-status" role="status">Getting the solar system ready…</p>
          <div class="solar-orbit-stage-footer"><p data-view-help>Drag to turn · Pinch to zoom</p><div class="solar-orbit-tools">${button('zoom:out', '− Zoom out')}${button('zoom:in', '+ Zoom in')}${button('reset', 'Reset view')}</div></div>
        </div>
        <aside class="solar-orbit-panel" aria-label="Explore the worlds">
          <span class="solar-orbit-eyebrow">YOUR LITTLE CORNER OF SPACE</span><h2>Take a look around.</h2>
          <div class="solar-orbit-targets" aria-label="Choose a view">${button('view:system', 'All together')}${button('view:sun', 'Sun')}${PLANETS.map((planet) => button(`view:${planet.id}`, planet.name)).join('')}</div>
          <div class="solar-orbit-fact-card" aria-live="polite"><h3 data-fact-title></h3><p data-fact-detail></p><p class="solar-orbit-did-you-know"><span class="solar-orbit-eyebrow">DID YOU KNOW?</span><span data-fact></span></p>${button('read', 'Read to me', 'solar-orbit-read')}</div>
          <div class="solar-orbit-motion-controls">${button('play', 'Pause motion')}${button('step', 'Move planets one step →')}${button('orbit', 'Hide orbit paths')}</div>
          <span class="solar-orbit-eyebrow">TURN YOUR VIEW</span>
          <div class="solar-orbit-turn-controls">${button('turn:left', '↶ Turn left')}${button('turn:right', '↷ Turn right')}${button('turn:up', '↑ Look up')}${button('turn:down', '↓ Look down')}</div>
          <p class="solar-orbit-scale-note">Sizes, distances, and speeds are simplified to fit all eight planets. This is a model, not today’s sky.</p>
          <p class="solar-orbit-credits">Earth imagery: NASA Earth Observatory.<br/>Other worlds use locally generated illustrations.</p>
        </aside>
      </div>`);
    const host = this.menu.root.querySelector<HTMLElement>('[data-view]');
    if (!host) throw new Error('Solar system view container is missing.');
    this.host = host;
    this.gestures = new OrbitGestureAdapter(host, actions);
    this.refreshUi();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.generation += 1;
      this.gestures?.destroy();
      this.gestures = undefined;
      this.view?.dispose();
      this.view = undefined;
      this.menu.destroy();
      stopSpeaking();
    });
    void this.loadView(this.generation);
  }

  update(_time: number, delta: number): void {
    if (this.leaving || document.hidden) return;
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
    if (actions.wasPressed('cancel')) this.leave();
    if (actions.wasPressed('pause')) this.activate('play');
    const gesture = actions.consumeViewGesture();
    if (gesture) {
      this.state = moveView(this.state, gesture);
      this.dirty = true;
    }
    if (!this.ready || this.leaving) return;
    this.frameSeconds += Math.min(delta, 100) / 1000;
    // Keep tablet GPU work at 30 FPS and render a still view only after an interaction or resize.
    if (this.frameSeconds < 1 / 30 && !this.dirty && !this.view?.needsRender) return;
    const next = advanceExplorer(this.state, this.frameSeconds, preferences.current.reducedMotion);
    this.frameSeconds = 0;
    if (next !== this.state) this.dirty = true;
    this.state = next;
    if (this.dirty || this.view?.needsRender) {
      this.view?.render(this.state);
      this.dirty = false;
    }
  }

  private async loadView(generation: number): Promise<void> {
    try {
      // Bundle the renderer separately and initialize it only when this explorer opens.
      const { SolarOrbitView } = await import('./SolarOrbitView');
      if (generation !== this.generation || this.leaving) return;
      const view = new SolarOrbitView(this.host, () => {
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
    if (action === 'mute') {
      preferences.toggleMute();
      if (preferences.current.muted) stopSpeaking();
    } else if (action === 'motion') {
      preferences.toggleReducedMotion();
    } else if (action === 'play' && !preferences.current.reducedMotion) {
      this.state = { ...this.state, playing: !this.state.playing };
    } else if (action === 'step') {
      this.state = stepPlanets(this.state);
    } else if (action === 'orbit') {
      this.state = { ...this.state, showOrbit: !this.state.showOrbit };
    } else if (action === 'reset') {
      this.state = changeView(this.state, this.state.target);
    } else if (action === 'read') {
      const fact = worldFacts(this.state.target);
      speak(`${fact.title} ${fact.detail} ${fact.fact}`, preferences.current.muted);
    } else if (action.startsWith('view:')) {
      const target = action.slice(5);
      if (!isViewTarget(target)) return;
      this.state = changeView(this.state, target);
      speak(worldFacts(target).title, preferences.current.muted);
    } else if (action.startsWith('turn:') || action.startsWith('zoom:')) {
      this.state = moveView(this.state, {
        rotateX: action === 'turn:left' ? -0.22 : action === 'turn:right' ? 0.22 : 0,
        rotateY: action === 'turn:up' ? 0.15 : action === 'turn:down' ? -0.15 : 0,
        zoom: action === 'zoom:in' ? 0.15 : action === 'zoom:out' ? -0.15 : 0,
      });
    }
    this.dirty = true;
    this.refreshUi();
  }

  private refreshUi(): void {
    const fact = worldFacts(this.state.target);
    this.setText('[data-fact-title]', fact.title);
    this.setText('[data-fact-detail]', fact.detail);
    this.setText('[data-fact]', fact.fact);
    this.setText(
      '[data-view-title]',
      this.state.target === 'system'
        ? 'Our solar system'
        : this.state.target === 'sun'
          ? 'Our bright star'
          : (PLANETS.find((planet) => planet.id === this.state.target)?.name ?? 'Our solar system'),
    );
    this.setText('[data-action="mute"]', preferences.current.muted ? 'Sound off' : 'Sound on');
    this.setText(
      '[data-action="motion"]',
      preferences.current.reducedMotion ? 'Still view' : 'Gentle motion',
    );
    this.setText(
      '[data-action="play"]',
      preferences.current.reducedMotion
        ? 'Motion paused in still view'
        : this.state.playing
          ? 'Pause motion'
          : 'Resume motion',
    );
    const playButton = this.menu.root.querySelector<HTMLButtonElement>('[data-action="play"]');
    if (playButton) playButton.disabled = preferences.current.reducedMotion;
    this.setText(
      '[data-action="orbit"]',
      this.state.showOrbit ? 'Hide orbit paths' : 'Show orbit paths',
    );
    this.menu.root
      .querySelector('[data-action="play"]')
      ?.setAttribute(
        'aria-pressed',
        String(!this.state.playing || preferences.current.reducedMotion),
      );
    this.menu.root
      .querySelector('[data-action="orbit"]')
      ?.setAttribute('aria-pressed', String(this.state.showOrbit));
    for (const target of VIEW_TARGETS) {
      this.menu.root
        .querySelector(`[data-action="view:${target}"]`)
        ?.setAttribute('aria-pressed', String(target === this.state.target));
    }
    this.setText(
      '[data-view-help]',
      preferences.current.reducedMotion
        ? 'Still view · Drag to turn or move planets one step'
        : 'Drag to turn · Pinch to zoom',
    );
    this.menu.refreshButtons();
  }

  private showFallback(): void {
    if (this.fallback) return;
    this.fallback = true;
    this.ready = true;
    this.view?.dispose();
    this.view = undefined;
    this.setText('[data-load-status]', 'Picture view — 3D could not start on this device.');
    const status = this.menu.root.querySelector<HTMLElement>('[data-load-status]');
    if (status) status.hidden = false;
    this.view = new SolarSystemPictureView(this.host);
    this.dirty = true;
  }

  private setText(selector: string, text: string): void {
    const element = this.menu.root.querySelector(selector);
    if (element && element.textContent !== text) element.textContent = text;
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.menu.root.style.pointerEvents = 'none';
    goToScene(this, 'GameHub');
  }
}
