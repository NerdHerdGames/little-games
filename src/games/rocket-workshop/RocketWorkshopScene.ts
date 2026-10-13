import Phaser from 'phaser';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { actions, preferences } from '../../core/services';
import { goToScene } from '../../core/SceneTransitions';
import { ActionMenu } from '../../ui/ActionMenu';
import { planetImage, stageArt } from './art';
import {
  createRocket,
  cyclePart,
  DESTINATIONS,
  getPart,
  getRocketStats,
  PART_SLOTS,
  planFlight,
  sampleFlight,
  type Destination,
  type FlightPhase,
  type FlightPlan,
  type RocketBuild,
} from './rules';
import './style.css';

type WorkshopStep = 'build' | 'destination' | 'flight' | 'arrived';

const button = (id: string, label: string, className = '', ariaLabel = label): string =>
  `<button type="button" data-action="${id}" class="${className}" aria-label="${ariaLabel}">${label}</button>`;

const PHASE_TEXT: Record<FlightPhase, string> = {
  launch: 'Lifting off!',
  cruise: 'Cruising through space',
  approach: 'Slowing down for arrival',
  arrived: 'You made it!',
};

/** Scene lifecycle and shared actions drive responsive HTML/SVG presentation and pure flight rules. */
export class RocketWorkshopScene extends Phaser.Scene {
  private build: RocketBuild = createRocket();
  private destination: Destination = DESTINATIONS.find(({ id }) => id === 'mars')!;
  private step: WorkshopStep = 'build';
  private menu!: ActionMenu;
  private flight: FlightPlan | undefined;
  private elapsed = 0;
  private paused = false;
  private leaving = false;
  private phase: FlightPhase = 'launch';
  private ship: SVGGElement | null = null;
  private flame: SVGGElement | null = null;
  private destinationArt: SVGGElement | null = null;
  private earth: SVGGElement | null = null;
  private stars: SVGGElement | null = null;
  private meter: HTMLProgressElement | null = null;
  private flightStatus: HTMLElement | null = null;
  private flightPercent: HTMLElement | null = null;
  private speedText: HTMLElement | null = null;
  private lastPercent = -1;

  constructor() {
    super('RocketWorkshop');
  }

  create(): void {
    this.build = createRocket();
    this.step = 'build';
    this.flight = undefined;
    this.elapsed = 0;
    this.paused = false;
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'rocket-workshop', 'Rocket Workshop');
    this.render();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.menu.destroy();
      stopSpeaking();
    });
  }

  update(_time: number, delta: number): void {
    if (this.leaving) return;
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
    if (actions.wasPressed('cancel')) {
      if (this.step === 'destination') {
        this.step = 'build';
        this.render();
      } else if (this.step === 'flight') this.togglePause();
      else this.leave();
    }
    if (actions.wasPressed('pause') && this.step === 'flight') this.togglePause();
    if (this.step !== 'flight' || !this.flight || this.paused || this.leaving || document.hidden)
      return;
    // Background tabs never fast-forward the trip; unusually long frames advance gently.
    this.elapsed = Math.min(this.flight.duration, this.elapsed + Math.min(delta, 100) / 1000);
    const sample = sampleFlight(this.flight, this.elapsed);
    this.paintFlight(sample);
    if (sample.phase !== this.phase) {
      this.phase = sample.phase;
      if (this.flightStatus) this.flightStatus.textContent = PHASE_TEXT[sample.phase];
      speak(PHASE_TEXT[sample.phase], preferences.current.muted);
    }
    if (sample.phase === 'arrived') {
      this.step = 'arrived';
      this.render();
      playPlacementTone(preferences.current.muted);
      speak(
        `You made it to ${this.destination.name}! Your rocket is safely in orbit.`,
        preferences.current.muted,
      );
    }
  }

  private activate(id: string): void {
    if (id === 'library') return this.leave();
    if (id === 'mute') {
      preferences.toggleMute();
      if (preferences.current.muted) stopSpeaking();
      this.updatePreferenceButtons();
      return;
    }
    if (id === 'motion') {
      preferences.toggleReducedMotion();
      this.updatePreferenceButtons();
      if (this.flight && this.step === 'flight')
        this.paintFlight(sampleFlight(this.flight, this.elapsed));
      return;
    }
    if (id === 'pause' && this.step === 'flight') return this.togglePause();
    if (id === 'build' && this.step !== 'flight') {
      this.step = 'build';
      this.render();
      return;
    }
    if (id === 'destination' && this.step !== 'flight') {
      this.step = 'destination';
      this.render();
      return;
    }
    if (id === 'launch' && (this.step === 'destination' || this.step === 'arrived')) {
      this.flight = planFlight(this.build, this.destination);
      this.elapsed = 0;
      this.paused = false;
      this.phase = 'launch';
      this.step = 'flight';
      this.lastPercent = -1;
      this.render();
      speak(`Lift off! Let's visit ${this.destination.name}.`, preferences.current.muted);
      return;
    }
    if (this.step === 'destination' && id.startsWith('world:')) {
      const world = DESTINATIONS.find(({ id: worldId }) => worldId === id.slice(6));
      if (world) {
        this.destination = world;
        this.refreshDestination();
        speak(world.name, preferences.current.muted);
      }
    }
    if (this.step === 'build') {
      for (const slot of PART_SLOTS) {
        if (id !== `${slot}:previous` && id !== `${slot}:next`) continue;
        this.build = cyclePart(this.build, slot, id.endsWith('next') ? 1 : -1);
        this.refreshBuild();
        speak(getPart(this.build, slot).name, preferences.current.muted);
      }
    }
  }

  private render(): void {
    const flying = this.step === 'flight' || this.step === 'arrived';
    this.menu.setContent(`
      <header class="rocket-header">
        <div class="rocket-brand"><span class="rocket-brand-mark" aria-hidden="true">↗</span><div><span class="rocket-eyebrow">LITTLE GAMES / SPACE LAB</span><h1>Rocket Workshop</h1></div></div>
        <nav aria-label="Game options">
          ${button('mute', '', 'rocket-option')}${button('motion', '', 'rocket-option')}${button('library', 'Games', 'rocket-option')}
        </nav>
      </header>
      <ol class="rocket-steps" aria-label="Your trip">
        <li class="${this.step === 'build' ? 'current' : ''}"><span>1</span> Build a rocket</li>
        <li class="${this.step === 'destination' ? 'current' : ''}"><span>2</span> Pick a planet</li>
        <li class="${flying ? 'current' : ''}"><span>3</span> Fly to space</li>
      </ol>
      <div class="rocket-workspace">
        <div class="rocket-preview">
          <div class="rocket-preview-label">${flying ? `MISSION / ${this.destination.name.toUpperCase()}` : 'YOUR ROCKET / READY TO CREATE'}</div>
          <div data-stage>${stageArt(this.build, this.destination.id, flying)}</div>
          <div class="rocket-preview-caption"><span class="rocket-eyebrow">${flying ? 'A LITTLE SPACE ADVENTURE' : 'BUILT BY YOU'}</span><strong>${flying ? this.destination.name : 'Make it your own.'}</strong><span>${flying ? 'A pretend trip. Every rocket arrives safely.' : 'Mix pieces. Try a flight. Build again.'}</span></div>
        </div>
        <div class="rocket-panel">${this.panelContent()}</div>
      </div>`);
    this.updatePreferenceButtons();
    this.ship = this.menu.root.querySelector('[data-ship]');
    this.flame = this.menu.root.querySelector('[data-flame]');
    this.destinationArt = this.menu.root.querySelector('[data-destination]');
    this.earth = this.menu.root.querySelector('[data-earth]');
    this.stars = this.menu.root.querySelector('[data-stars]');
    this.meter = this.menu.root.querySelector('[data-flight-meter]');
    this.flightStatus = this.menu.root.querySelector('[data-flight-status]');
    this.flightPercent = this.menu.root.querySelector('[data-flight-percent]');
    this.speedText = this.menu.root.querySelector('[data-flight-speed]');
    if (this.step === 'destination') this.refreshDestination();
    if (this.flight && flying) this.paintFlight(sampleFlight(this.flight, this.elapsed));
  }

  private panelContent(): string {
    if (this.step === 'build') {
      return `<div class="rocket-panel-heading"><span class="rocket-eyebrow">01 / THE WORKSHOP</span><h2>Meet your next rocket.</h2><p>Tap the arrows to try different pieces.</p></div>
        <div class="rocket-parts">${PART_SLOTS.map((slot, index) => {
          const part = getPart(this.build, slot);
          return `<div class="rocket-part-row">
            <span class="rocket-part-number" aria-hidden="true">0${index + 1}</span>
            ${button(`${slot}:previous`, '‹', 'rocket-cycle', `Previous ${slot} piece`)}
            <div class="rocket-part-copy"><span class="rocket-eyebrow">${slot.toUpperCase()} <span data-piece-count="${slot}">${this.build[slot] + 1} / 3</span></span><strong data-part-name="${slot}">${part.name}</strong><span data-part-description="${slot}">${part.description}</span></div>
            ${button(`${slot}:next`, '›', 'rocket-cycle', `Next ${slot} piece`)}
          </div>`;
        }).join('')}</div>
        <div class="rocket-stats" data-build-stats aria-live="polite">${this.statsContent()}</div>
        ${button('destination', 'Pick a planet →', 'rocket-primary')}`;
    }
    if (this.step === 'destination') {
      return `<div class="rocket-panel-heading"><span class="rocket-eyebrow">02 / YOUR DESTINATION</span><h2>Where shall we go?</h2><p>Pick a world for your rocket to visit.</p></div>
        <div class="rocket-worlds" aria-label="Destinations">${DESTINATIONS.map(
          (world) =>
            `<button type="button" data-action="world:${world.id}" aria-pressed="${world.id === this.destination.id}"><img src="${planetImage(world.id)}" alt=""/><span>${world.name}</span></button>`,
        ).join('')}</div>
        <p class="rocket-route" data-route aria-live="polite"></p>
        <div class="rocket-panel-actions">${button('build', '← Pieces', 'rocket-secondary')}${button('launch', 'Lift off! ↗', 'rocket-primary')}</div>`;
    }
    if (this.step === 'flight') {
      return `<div class="rocket-panel-heading"><span class="rocket-eyebrow">03 / FLIGHT IN PROGRESS</span><h2>Next stop: ${this.destination.name}.</h2><p>Your rocket flies itself. Enjoy the ride!</p></div>
        <div class="rocket-flight-card">
          <span class="rocket-eyebrow">MISSION STATUS</span><h3 data-flight-status role="status">Lifting off!</h3>
          <div class="rocket-flight-percent" data-flight-percent>0%</div>
          <progress data-flight-meter max="1" value="0" aria-label="Journey progress"></progress>
          <div class="rocket-route-labels"><span>Lift-off</span><span>${this.destination.name}</span></div>
          <p data-flight-speed>Getting ready to fly</p>
        </div>
        <div class="rocket-stats">${this.statsContent()}</div>
        <p class="rocket-flight-hint">${getPart(this.build, 'engine').description} ${getPart(this.build, 'fins').description}</p>
        ${button('pause', 'Pause flight', 'rocket-secondary rocket-full')}`;
    }
    return `<div class="rocket-panel-heading"><span class="rocket-eyebrow">MISSION COMPLETE</span><h2>Hello, ${this.destination.name}!</h2><p>Your very own rocket made it to space.</p></div>
      <div class="rocket-arrival"><span class="rocket-arrival-check" aria-hidden="true">✓</span><h3>Safely in orbit.</h3><p>Look at that world! Ready for another adventure?</p><div class="rocket-arrival-result">${Math.round(this.flight?.duration ?? 0)} seconds of pretend space travel<br/>${getPart(this.build, 'engine').name} + ${getPart(this.build, 'fins').name}</div></div>
      ${button('build', 'Change my rocket', 'rocket-primary')}
      <div class="rocket-panel-actions">${button('destination', 'Another planet', 'rocket-secondary')}${button('launch', 'Fly again', 'rocket-secondary')}</div>`;
  }

  private statsContent(): string {
    const stats = getRocketStats(this.build);
    return `<div><span class="rocket-eyebrow">SPEED</span><strong>${stats.speed > 25 ? 'Speedy' : stats.speed > 20 ? 'Zippy' : 'Gentle'}</strong></div>
      <div><span class="rocket-eyebrow">LIFT-OFF</span><strong>${stats.launchSeconds < 3 ? 'Quick' : stats.launchSeconds < 4.2 ? 'Steady' : 'Slow & easy'}</strong></div>
      <div><span class="rocket-eyebrow">RIDE</span><strong>${stats.wobble <= 2 ? 'Very steady' : stats.wobble <= 6 ? 'A little wiggle' : 'Wobbly'}</strong></div>`;
  }

  private refreshBuild(): void {
    for (const slot of PART_SLOTS) {
      const part = getPart(this.build, slot);
      this.setText(`[data-part-name="${slot}"]`, part.name);
      this.setText(`[data-part-description="${slot}"]`, part.description);
      this.setText(`[data-piece-count="${slot}"]`, `${this.build[slot] + 1} / 3`);
    }
    const stage = this.menu.root.querySelector('[data-stage]');
    if (stage) stage.innerHTML = stageArt(this.build, this.destination.id, false);
    const stats = this.menu.root.querySelector('[data-build-stats]');
    if (stats) stats.innerHTML = this.statsContent();
  }

  private refreshDestination(): void {
    for (const world of this.menu.root.querySelectorAll<HTMLButtonElement>(
      '.rocket-worlds button',
    )) {
      world.setAttribute(
        'aria-pressed',
        String(world.dataset.action === `world:${this.destination.id}`),
      );
    }
    const plan = planFlight(this.build, this.destination);
    this.setText(
      '[data-route]',
      `${this.destination.name} · About ${Math.round(plan.duration)} seconds of pretend flight`,
    );
    const launch = this.menu.root.querySelector('[data-action="launch"]');
    launch?.setAttribute('aria-label', `Lift off to ${this.destination.name}`);
  }

  private paintFlight(sample: ReturnType<typeof sampleFlight>): void {
    const reduced = preferences.current.reducedMotion;
    const p = sample.progress;
    const x = reduced ? 270 : 130 + p * 220;
    const y = reduced ? 300 : 385 - p * 165;
    this.ship?.setAttribute(
      'transform',
      `translate(${x} ${y}) rotate(${reduced ? 0 : 35 + sample.wobble}) scale(.85)`,
    );
    this.flame?.setAttribute(
      'visibility',
      this.paused || sample.phase === 'arrived' ? 'hidden' : 'visible',
    );
    this.earth?.setAttribute('opacity', reduced ? '.7' : String(Math.max(0, 1 - p * 3)));
    this.destinationArt?.setAttribute(
      'transform',
      `translate(470 135) scale(${reduced ? 0.9 : 0.55 + p * 0.45})`,
    );
    this.stars?.setAttribute(
      'transform',
      reduced ? 'translate(0 0)' : `translate(${-p * 22} ${p * 12})`,
    );
    if (this.meter) this.meter.value = p;
    const percent = Math.floor(p * 100);
    if (percent !== this.lastPercent) {
      this.lastPercent = percent;
      if (this.flightPercent) this.flightPercent.textContent = `${percent}%`;
      if (this.speedText)
        this.speedText.textContent = `Pretend speed: ${Math.round(sample.velocity)} space units / second`;
    }
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.setText('[data-action="pause"]', this.paused ? 'Resume flight' : 'Pause flight');
    this.menu.root
      .querySelector('[data-action="pause"]')
      ?.setAttribute('aria-label', this.paused ? 'Resume flight' : 'Pause flight');
    if (this.flightStatus)
      this.flightStatus.textContent = this.paused
        ? 'Taking a little break'
        : PHASE_TEXT[this.phase];
    if (this.flight) this.paintFlight(sampleFlight(this.flight, this.elapsed));
    if (this.paused) stopSpeaking();
  }

  private updatePreferenceButtons(): void {
    this.setText('[data-action="mute"]', preferences.current.muted ? 'Sound off' : 'Sound on');
    this.setText(
      '[data-action="motion"]',
      preferences.current.reducedMotion ? 'Still view' : 'Gentle motion',
    );
    this.menu.root
      .querySelector('[data-action="mute"]')
      ?.setAttribute('aria-label', preferences.current.muted ? 'Turn sound on' : 'Turn sound off');
    this.menu.root
      .querySelector('[data-action="motion"]')
      ?.setAttribute(
        'aria-label',
        preferences.current.reducedMotion ? 'Use gentle motion' : 'Use a still view',
      );
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
