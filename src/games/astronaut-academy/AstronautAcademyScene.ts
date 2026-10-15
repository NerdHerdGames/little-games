import Phaser from 'phaser';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { actions, preferences } from '../../core/services';
import { goToScene } from '../../core/SceneTransitions';
import { ActionMenu } from '../../ui/ActionMenu';
import { icon, stageArt } from './art';
import {
  advanceTraining,
  chooseAnswer,
  completedTasks,
  createTraining,
  currentTask,
  STATIONS,
  TOTAL_TASKS,
  type TrainingState,
} from './rules';
import './style.css';

const button = (action: string, label: string, className = ''): string =>
  `<button type="button" data-action="${action}" class="${className}">${label}</button>`;

export class AstronautAcademyScene extends Phaser.Scene {
  private menu!: ActionMenu;
  private training: TrainingState = createTraining();
  private started = false;
  private leaving = false;

  constructor() {
    super('AstronautAcademy');
  }

  create(): void {
    this.training = createTraining();
    this.started = false;
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'astronaut-academy', 'Astronaut Academy');
    this.render();
    window.addEventListener('preferenceschange', this.syncPreferences);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('preferenceschange', this.syncPreferences);
      this.menu.destroy();
      stopSpeaking();
    });
  }

  update(): void {
    if (this.leaving || document.hidden) return;
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
    if (actions.wasPressed('cancel')) this.leave();
  }

  private activate(id: string): void {
    if (id === 'games') return this.leave();
    if (id === 'mute') {
      preferences.toggleMute();
      return;
    }
    if (id === 'motion') {
      preferences.toggleReducedMotion();
      return;
    }
    if (id === 'read') {
      const task = currentTask(this.training);
      const text = !this.started
        ? 'Welcome to Astronaut Academy! Practice four astronaut skills. Tap Start training to begin.'
        : this.training.complete
          ? 'Training complete! You practiced being prepared, teamwork, caring for yourself, and science.'
          : task
            ? `${task.prompt} ${task.choices.map(({ label }) => label).join('. ')}. ${this.training.solved ? task.fact : ''}`
            : '';
      speak(text, preferences.current.muted);
      return;
    }
    if (id === 'start' || (id === 'replay' && this.training.complete)) {
      this.training = createTraining();
      this.started = true;
      this.render(true);
      return;
    }
    if (!this.started || this.training.complete) return;
    const task = currentTask(this.training)!;
    if (id === 'hint' && !this.training.solved) return this.feedback(task.hint);
    if (id === 'next' && this.training.solved) {
      this.training = advanceTraining(this.training);
      this.render(true);
      if (this.training.complete)
        speak('Training complete! Well done, space explorer.', preferences.current.muted);
      return;
    }
    if (!id.startsWith('choose:') || this.training.solved) return;
    const selected = id.slice(7);
    if (!task.choices.some(({ id: choiceId }) => choiceId === selected)) return;
    const next = chooseAnswer(this.training, selected);
    if (!next.solved) return this.feedback(`Keep exploring! ${task.hint}`);
    this.training = next;
    this.render();
    this.menu.root.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus();
    playPlacementTone(preferences.current.muted);
    speak(`You found it! ${task.fact}`, preferences.current.muted);
  }

  private feedback(text: string): void {
    const element = this.menu.root.querySelector('[data-feedback]');
    if (element) element.textContent = text;
    speak(text, preferences.current.muted);
  }

  private render(focusHeading = false): void {
    if (focusHeading) stopSpeaking();
    const station = STATIONS[this.training.station]!;
    const done = this.training.complete;
    this.menu.setContent(`
      <header class="academy-header"><div class="academy-brand"><span class="academy-brand-icon" aria-hidden="true">${icon('helmet')}</span><div><span class="academy-kicker">LITTLE GAMES / DISCOVERY LAB</span><h1>Astronaut Academy</h1></div></div>
        <nav aria-label="Game options">${button('mute', '', 'academy-option')}${button('motion', '', 'academy-option')}${button('games', 'Games', 'academy-option')}</nav></header>
      <ol class="academy-stations" aria-label="Training stations">${STATIONS.map((item, index) => `<li ${this.started && !done && index === this.training.station ? 'aria-current="step"' : ''} class="${done || index < this.training.station ? 'finished' : ''}"><span aria-hidden="true">${done || index < this.training.station ? '✓' : `0${index + 1}`}</span>${item.title}${done || index < this.training.station ? '<span class="academy-sr"> complete</span>' : ''}</li>`).join('')}</ol>
      <main class="academy-workspace"><div class="academy-illustration"><span class="academy-kicker">${done ? 'EXPLORER / TRAINING COMPLETE' : !this.started ? 'YOUR NEXT ADVENTURE STARTS HERE' : `STATION 0${this.training.station + 1} / ${station.skill.toUpperCase()}`}</span>${stageArt(this.training.station, done)}<div class="academy-art-caption"><span class="academy-kicker">${done ? 'CURIOUS MINDS GO FAR' : 'SMALL STEPS. BIG DISCOVERIES.'}</span><strong>${done ? 'Keep asking questions.' : !this.started ? 'Hello, space explorer.' : station.skill + '.'}</strong><p>A pretend mission. Real things to learn.</p></div></div>
        <section class="academy-panel" aria-labelledby="academy-title">${this.panel()}</section></main>`);
    this.syncPreferences();
    if (focusHeading) this.menu.root.querySelector<HTMLElement>('#academy-title')?.focus();
  }

  private panel(): string {
    if (!this.started)
      return `<span class="academy-kicker">WELCOME TO YOUR TRAINING</span><h2 id="academy-title" tabindex="-1">How do you become<br/>an astronaut?</h2><p class="academy-intro">Start with curiosity. Practice with a team. Let’s try four astronaut skills!</p><div class="academy-welcome-skills">${STATIONS.map((station) => `<div>${icon(station.icon)}<span>${station.skill}</span></div>`).join('')}</div><p class="academy-note">Tap a picture to choose. Take your time.<br/>You can always try again.</p>${button('start', 'Start training →', 'academy-primary')}${button('read', 'Read to me', 'academy-read')}<p class="academy-source">Learning inspired by NASA’s astronaut education resources.</p>`;
    if (this.training.complete)
      return `<span class="academy-kicker">ALL FOUR STATIONS COMPLETE</span><h2 id="academy-title" tabindex="-1">You did it, explorer!</h2><p class="academy-intro">You practiced thinking like an astronaut.</p><div class="academy-certificate"><div class="academy-seal" aria-hidden="true">✦</div><strong>Astronaut Academy</strong><span>TRAINING COMPLETE</span><ul>${STATIONS.map((station) => `<li>✓ ${station.skill}</li>`).join('')}</ul></div><p class="academy-note">Real astronauts keep learning and practicing. Stay curious, and keep working together!</p>${button('replay', 'Train again', 'academy-primary')}${button('games', 'Choose another game')}`;
    const task = currentTask(this.training)!;
    const station = STATIONS[this.training.station]!;
    return `<div class="academy-task-top"><span class="academy-kicker">${station.title.toUpperCase()} / ACTIVITY ${this.training.task + 1} OF ${station.tasks.length}</span>${button('read', 'Read to me', 'academy-read')}</div><div class="academy-progress-label"><span>Your training</span><span>${completedTasks(this.training)} / ${TOTAL_TASKS} activities</span></div><progress max="${TOTAL_TASKS}" value="${completedTasks(this.training)}" aria-label="Completed training activities"></progress><h2 id="academy-title" tabindex="-1">${task.prompt}</h2><p class="academy-note">${this.training.solved ? 'You found it! Here is why.' : 'Tap a picture to choose.'}</p><div class="academy-choices">${task.choices.map((item) => `<button type="button" data-action="choose:${item.id}" ${this.training.solved ? 'disabled' : ''} class="${this.training.solved && item.id === task.answer ? 'chosen' : ''}">${icon(item.icon)}<span>${item.label}</span>${this.training.solved && item.id === task.answer ? '<b class="academy-choice-check">✓ Chosen</b>' : ''}</button>`).join('')}</div><div class="academy-feedback ${this.training.solved ? 'solved' : ''}" data-feedback role="status" aria-live="polite">${this.training.solved ? task.fact : 'Every astronaut starts by learning. You can do this!'}</div>${this.training.solved ? button('next', this.training.task < station.tasks.length - 1 ? 'Next activity →' : this.training.station < STATIONS.length - 1 ? 'Next station →' : 'Finish training ✦', 'academy-primary') : button('hint', 'Give me a hint', 'academy-hint')}`;
  }

  private syncPreferences = (): void => {
    const { muted, reducedMotion } = preferences.current;
    this.menu.root.dataset.reducedMotion = String(reducedMotion);
    for (const [action, text, pressed] of [
      ['mute', muted ? 'Sound off' : 'Sound on', muted],
      ['motion', reducedMotion ? 'Still view' : 'Gentle motion', reducedMotion],
    ] as const) {
      const element = this.menu.root.querySelector(`[data-action="${action}"]`);
      if (element) {
        element.textContent = text;
        element.setAttribute('aria-pressed', String(pressed));
      }
    }
    const read = this.menu.root.querySelector<HTMLButtonElement>('[data-action="read"]');
    if (read) {
      read.disabled = muted;
      read.textContent = muted ? 'Sound off' : 'Read to me';
    }
    this.menu.refreshButtons();
    if (muted) stopSpeaking();
  };

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    stopSpeaking();
    this.menu.root.style.pointerEvents = 'none';
    goToScene(this, 'GameHub');
  }
}
