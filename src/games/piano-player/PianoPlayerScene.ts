import Phaser from 'phaser';
import { PianoAudio } from '../../accessibility/PianoAudio';
import { actions, preferences } from '../../core/services';
import { goToScene } from '../../core/SceneTransitions';
import { ActionMenu } from '../../ui/ActionMenu';
import {
  PIANO_KEYS,
  playNote,
  startSong,
  type NoteId,
  type Song,
  type SongProgress,
} from './rules';
import { SONGS } from './songs';
import './style.css';

export class PianoPlayerScene extends Phaser.Scene {
  private menu!: ActionMenu;
  private audio!: PianoAudio;
  private song: Song | undefined;
  private progress: SongProgress = startSong();
  private songsOpen = true;
  private labels = true;
  private leaving = false;
  private lastKey: NoteId | undefined;
  private keyUntil = 0;

  constructor() {
    super('PianoPlayer');
  }

  create(): void {
    this.song = undefined;
    this.progress = startSong();
    this.songsOpen = true;
    this.labels = true;
    this.leaving = false;
    this.lastKey = undefined;
    this.menu = new ActionMenu(actions, 'piano-player', 'Piano Player');
    this.audio = new PianoAudio(this.menu.root, () => preferences.current.muted);
    this.render();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.destroy();
      this.menu.destroy();
    });
  }

  update(time: number): void {
    if (this.leaving) return;
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation, time);
    if (actions.wasPressed('cancel')) this.leave();
    if (this.lastKey && time >= this.keyUntil) {
      this.menu.root
        .querySelector(`[data-action="key:${this.lastKey}"]`)
        ?.classList.remove('pressed');
      this.lastKey = undefined;
    }
  }

  private activate(id: string, time: number): void {
    if (id === 'library') return this.leave();
    if (id === 'songs') this.songsOpen = !this.songsOpen;
    else if (id === 'labels') this.labels = !this.labels;
    else if (id === 'mute') preferences.toggleMute();
    else if (id === 'motion') preferences.toggleReducedMotion();
    else if (id === 'restart') this.progress = startSong();
    else if (id === 'free') {
      this.song = undefined;
      this.progress = startSong();
    } else if (id.startsWith('song:')) {
      this.song = SONGS.find((song) => song.id === id.slice(5));
      this.progress = startSong();
    } else if (id.startsWith('key:')) {
      const key = PIANO_KEYS.find((key) => key.id === id.slice(4));
      if (!key) return;
      this.audio.play(key.midi);
      if (this.lastKey)
        this.menu.root
          .querySelector(`[data-action="key:${this.lastKey}"]`)
          ?.classList.remove('pressed');
      this.lastKey = key.id;
      this.keyUntil = time + 180;
      this.menu.root.querySelector(`[data-action="key:${key.id}"]`)?.classList.add('pressed');
      if (this.song) {
        const oldRow = this.progress.row;
        this.progress = playNote(this.song, this.progress, key.id);
        this.paintScore(oldRow !== this.progress.row);
      }
      return;
    } else return;
    this.render(id);
  }

  private render(focus?: string): void {
    this.menu.root.classList.toggle('piano-songs-closed', !this.songsOpen);
    this.menu.setContent(`
      <header class="piano-header">
        <button data-action="songs" aria-expanded="${this.songsOpen}" aria-controls="piano-songs">☰ Songs</button>
        <h1>Piano Player</h1>
        <nav aria-label="Piano options">
          <button data-action="labels" aria-pressed="${this.labels}">Labels ${this.labels ? 'on' : 'off'}</button>
          <button data-action="mute" aria-pressed="${preferences.current.muted}">Sound ${preferences.current.muted ? 'off' : 'on'}</button>
          <button data-action="motion" aria-pressed="${preferences.current.reducedMotion}">Still view ${preferences.current.reducedMotion ? 'on' : 'off'}</button>
          <button data-action="library">Games</button>
        </nav>
      </header>
      <div class="piano-workspace">
        <nav id="piano-songs" class="piano-songs" aria-label="Choose a song" ${this.songsOpen ? '' : 'hidden'}>
          <span class="piano-eyebrow">YOUR SONGBOOK</span>
          <button data-action="free" aria-pressed="${!this.song}">Free play<span>Make your own music</span></button>
          ${SONGS.map((song) => `<button data-action="song:${song.id}" aria-pressed="${song === this.song}">${song.title}<span>${song.rows.length} rows</span></button>`).join('')}
          <p>No rush. Every note is yours to try.</p>
        </nav>
        <main class="piano-main">
          <section class="piano-score" aria-label="Song notes">
            <div class="piano-score-heading"><div><span class="piano-eyebrow">${this.song ? 'FOLLOW THE NOTES' : 'A LITTLE ROOM FOR MUSIC'}</span><h2>${this.song?.title ?? 'Let’s play.'}</h2></div>
            ${this.song ? '<button data-action="restart">Start again</button>' : ''}</div>
            <div data-score></div>
          </section>
          <section class="piano-instrument" aria-label="One octave piano">
            <div class="piano-instrument-heading"><span>YOUR COLOR KEYBOARD</span><span>A3 – G♯4 · One octave</span></div>
            <div class="piano-key-scroll"><div class="piano-keys">
            ${PIANO_KEYS.map((key) => {
              const black = 'after' in key;
              const left = black ? ((key.after + 1 - 0.32) / 7.4) * 100 : (key.white / 7.4) * 100;
              return `<button data-action="key:${key.id}" class="piano-key ${black ? 'piano-black' : 'piano-white'}" style="left:${left}%;--note-color:${key.color}" aria-label="Play ${key.label}"><span class="piano-key-label" ${this.labels ? '' : 'hidden'}>${key.label}</span></button>`;
            }).join('')}
            </div></div>
            <p class="piano-help" data-help role="status"></p>
          </section>
        </main>
      </div>`);
    this.paintScore(false);
    if (focus)
      this.menu.root
        .querySelector<HTMLButtonElement>(`[data-action="${focus}"]`)
        ?.focus({ preventScroll: true });
  }

  private paintScore(animate: boolean): void {
    const score = this.menu.root.querySelector<HTMLElement>('[data-score]')!;
    const help = this.menu.root.querySelector<HTMLElement>('[data-help]')!;
    if (!this.song) {
      score.innerHTML =
        '<p class="piano-welcome">Tap a key. Try a tune.<br>Choose a song when you’re ready.</p>';
      help.textContent = 'Touch the keys, or use arrow keys and Enter to choose a note.';
      return;
    }
    const song = this.song;
    const { row, note, complete, played } = this.progress;
    const total = song.rows.reduce((sum, notes) => sum + notes.length, 0);
    const outgoing =
      animate && !preferences.current.reducedMotion
        ? (score.querySelector<HTMLElement>('.piano-note-scroll')?.cloneNode(true) as
            | HTMLElement
            | undefined)
        : undefined;
    score.innerHTML = `<div class="piano-progress"><span>${complete ? 'Song complete ✓' : `Row ${row + 1} of ${song.rows.length}`}</span><span>${played} / ${total} notes</span></div>
      <div class="piano-note-scroll"><ol class="piano-note-row" aria-label="Row ${row + 1}">${song.rows[
        row
      ]!.map((entry, i) => {
        const key = PIANO_KEYS.find((key) => key.id === entry.key)!;
        const done = complete || i < note;
        return `<li class="${done ? 'played' : i === note ? 'next' : ''}" ${!done && i === note ? 'aria-current="step"' : ''} style="--note-color:${key.color}"><span class="piano-finger">${entry.finger ?? ''}</span><span class="piano-note">${key.label.split(' / ')[0]}<small>${done ? '✓' : '♩'}</small></span><span class="piano-syllable">${entry.syllable ?? ''}</span><span class="piano-sr">${done ? 'Played' : i === note ? 'Next note' : ''}</span></li>`;
      }).join('')}</ol></div><p class="piano-source">${song.source}</p>`;
    const expected = song.rows[row]?.[note];
    const nextKey = PIANO_KEYS.find((key) => key.id === expected?.key);
    help.textContent = complete
      ? 'You played the whole song! Start again or choose another tune.'
      : `Next: ${nextKey?.label ?? ''}. Match the letter and color. Take your time.`;
    for (const key of this.menu.root.querySelectorAll<HTMLButtonElement>('.piano-key')) {
      const next = !complete && key.dataset.action === `key:${expected?.key}`;
      key.classList.toggle('expected', next);
      const definition = PIANO_KEYS.find((entry) => `key:${entry.id}` === key.dataset.action)!;
      key.setAttribute('aria-label', `Play ${definition.label}${next ? ', next note' : ''}`);
    }
    const current = score.querySelector<HTMLElement>('[aria-current]');
    const scroll = score.querySelector<HTMLElement>('.piano-note-scroll')!;
    if (current)
      scroll.scrollLeft = Math.max(
        0,
        current.offsetLeft - scroll.offsetLeft - scroll.clientWidth / 2,
      );
    if (outgoing) {
      outgoing.setAttribute('aria-hidden', 'true');
      for (const entry of outgoing.querySelectorAll('li')) {
        entry.className = 'played';
        entry.removeAttribute('aria-current');
        const mark = entry.querySelector('small');
        if (mark) mark.textContent = '✓';
      }
      outgoing.classList.add('piano-outgoing');
      score.append(outgoing);
      const exit = outgoing.animate(
        [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: 'translateY(-100%)', opacity: 0 },
        ],
        { duration: 260, easing: 'ease-out', fill: 'forwards' },
      );
      exit.onfinish = () => outgoing.remove();
      scroll.animate(
        [
          { transform: 'translateY(45px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 260, easing: 'ease-out' },
      );
    }
  }

  private leave(): void {
    this.leaving = true;
    this.audio.silence();
    goToScene(this, 'GameHub');
  }
}
