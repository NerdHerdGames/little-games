import Phaser from 'phaser';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { OrbitGestureAdapter } from '../../input/OrbitGestureAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import type { EarthMoonView } from './EarthMoonView';
import {
  advanceExplorer,
  changeView,
  createExplorer,
  moveView,
  stepMoon,
  WORLD_FACTS,
  type ExplorerState,
} from './rules';
import './style.css';

const button = (action: string, label: string, className = ''): string =>
  `<button type="button" data-action="${action}" class="${className}">${label}</button>`;

export class EarthMoonExplorerScene extends Phaser.Scene {
  private state: ExplorerState = createExplorer();
  private menu!: ActionMenu;
  private gestures: OrbitGestureAdapter | undefined;
  private view: EarthMoonView | undefined;
  private host!: HTMLElement;
  private ready = false;
  private fallback = false;
  private leaving = false;
  private generation = 0;
  private frameSeconds = 0;
  private dirty = true;

  constructor() {
    super('EarthMoonExplorer');
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
    this.menu = new ActionMenu(actions, 'earth-moon-explorer', 'Earth and Moon Explorer');
    this.menu.setContent(`
      <header class="earth-moon-header">
        <div><span class="earth-moon-eyebrow">LITTLE GAMES / SPACE LAB</span><h1>Earth &amp; Moon Explorer</h1></div>
        <nav aria-label="Game options">${button('mute', 'Sound on')}${button('motion', 'Gentle motion')}${button('library', 'Games')}</nav>
      </header>
      <div class="earth-moon-layout">
        <div class="earth-moon-stage">
          <div data-view class="earth-moon-view"></div>
          <div class="earth-moon-view-heading"><span class="earth-moon-eyebrow">A CLOSER LOOK AT SPACE</span><strong data-view-title>Earth and the Moon</strong></div>
          <p data-load-status class="earth-moon-load-status" role="status">Getting Earth and Moon ready…</p>
          <div class="earth-moon-stage-footer"><p data-view-help>Drag to turn · Pinch to zoom</p><div class="earth-moon-tools">${button('zoom:out', '− Zoom out')}${button('zoom:in', '+ Zoom in')}${button('reset', 'Reset view')}</div></div>
        </div>
        <aside class="earth-moon-panel" aria-label="Explore the worlds">
          <span class="earth-moon-eyebrow">YOUR LITTLE CORNER OF SPACE</span><h2>Take a look around.</h2>
          <div class="earth-moon-targets" aria-label="Choose a view">${button('view:system', 'Together')}${button('view:earth', 'Earth')}${button('view:moon', 'Moon')}</div>
          <div class="earth-moon-fact-card" aria-live="polite"><h3 data-fact-title></h3><p data-fact-detail></p><p class="earth-moon-did-you-know"><span class="earth-moon-eyebrow">DID YOU KNOW?</span><span data-fact></span></p>${button('read', 'Read to me', 'earth-moon-read')}</div>
          <div class="earth-moon-motion-controls">${button('play', 'Pause motion')}${button('step', 'Move the Moon one step →')}${button('orbit', 'Hide orbit path')}</div>
          <span class="earth-moon-eyebrow">TURN YOUR VIEW</span>
          <div class="earth-moon-turn-controls">${button('turn:left', '↶ Turn left')}${button('turn:right', '↷ Turn right')}${button('turn:up', '↑ Look up')}${button('turn:down', '↓ Look down')}</div>
          <p class="earth-moon-scale-note">The worlds and their motion are simplified. The Moon’s distance is shortened so both worlds fit.</p>
          <p class="earth-moon-credits">Earth imagery: NASA Earth Observatory.<br/>Moon imagery: NASA’s Scientific Visualization Studio.</p>
        </aside>
      </div>`);
    const host = this.menu.root.querySelector<HTMLElement>('[data-view]');
    if (!host) throw new Error('Earth and Moon view container is missing.');
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
      if (this.fallback) this.paintFallback();
      else this.view?.render(this.state);
      this.dirty = false;
    }
  }

  private async loadView(generation: number): Promise<void> {
    try {
      // Bundle the renderer separately and initialize it only when this explorer opens.
      const { EarthMoonView } = await import('./EarthMoonView');
      if (generation !== this.generation || this.leaving) return;
      const view = new EarthMoonView(this.host, () => {
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
    } else if (action === 'play') {
      this.state = { ...this.state, playing: !this.state.playing };
    } else if (action === 'step') {
      this.state = stepMoon(this.state);
    } else if (action === 'orbit') {
      this.state = { ...this.state, showOrbit: !this.state.showOrbit };
    } else if (action === 'reset') {
      this.state = changeView(this.state, this.state.target);
    } else if (action === 'read') {
      const fact = WORLD_FACTS[this.state.target];
      speak(`${fact.title} ${fact.detail} ${fact.fact}`, preferences.current.muted);
    } else if (action === 'view:system' || action === 'view:earth' || action === 'view:moon') {
      const target =
        action === 'view:system' ? 'system' : action === 'view:earth' ? 'earth' : 'moon';
      this.state = changeView(this.state, target);
      if (this.fallback) this.buildFallback();
      speak(WORLD_FACTS[target].title, preferences.current.muted);
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
    const fact = WORLD_FACTS[this.state.target];
    this.setText('[data-fact-title]', fact.title);
    this.setText('[data-fact-detail]', fact.detail);
    this.setText('[data-fact]', fact.fact);
    this.setText(
      '[data-view-title]',
      this.state.target === 'system'
        ? 'Earth and the Moon'
        : this.state.target === 'earth'
          ? 'Our blue planet'
          : 'Our rocky neighbor',
    );
    this.setText('[data-action="mute"]', preferences.current.muted ? 'Sound off' : 'Sound on');
    this.setText(
      '[data-action="motion"]',
      preferences.current.reducedMotion ? 'Still view' : 'Gentle motion',
    );
    this.setText('[data-action="play"]', this.state.playing ? 'Pause motion' : 'Resume motion');
    this.setText(
      '[data-action="orbit"]',
      this.state.showOrbit ? 'Hide orbit path' : 'Show orbit path',
    );
    this.menu.root
      .querySelector('[data-action="play"]')
      ?.setAttribute('aria-pressed', String(!this.state.playing));
    this.menu.root
      .querySelector('[data-action="orbit"]')
      ?.setAttribute('aria-pressed', String(this.state.showOrbit));
    for (const target of ['system', 'earth', 'moon']) {
      this.menu.root
        .querySelector(`[data-action="view:${target}"]`)
        ?.setAttribute('aria-pressed', String(target === this.state.target));
    }
    this.setText(
      '[data-view-help]',
      preferences.current.reducedMotion
        ? 'Still view · Drag to turn or move the Moon one step'
        : 'Drag to turn · Pinch to zoom',
    );
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
    this.buildFallback();
    this.dirty = true;
  }

  private buildFallback(): void {
    this.host.innerHTML = `<div class="earth-moon-picture-worlds"><div data-earth-picture class="earth-moon-picture earth-moon-picture-earth" role="img" aria-label="Earth surface picture"></div><div data-moon-picture class="earth-moon-picture earth-moon-picture-moon" role="img" aria-label="Moon surface picture"></div></div>`;
    this.paintFallback();
  }

  private paintFallback(): void {
    const earth = this.host.querySelector<HTMLElement>('[data-earth-picture]');
    const moon = this.host.querySelector<HTMLElement>('[data-moon-picture]');
    if (earth) {
      earth.hidden = this.state.target === 'moon';
      earth.style.backgroundPositionX = `${50 + (this.state.yaw / (Math.PI * 2)) * 100}%`;
      earth.style.transform = `scale(${this.state.zoom})`;
    }
    if (moon) {
      moon.hidden = this.state.target === 'earth';
      moon.style.backgroundPositionX = `${50 + (this.state.yaw / (Math.PI * 2)) * 100}%`;
      moon.style.transform = `scale(${this.state.zoom})`;
      moon.classList.toggle('earth-moon-picture-close', this.state.target === 'moon');
    }
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
