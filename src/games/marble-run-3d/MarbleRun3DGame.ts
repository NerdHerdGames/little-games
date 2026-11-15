import { Vector3 } from 'three';
import { actions, preferences } from '../../core/services';
import { speak, stopSpeaking } from '../../accessibility/Speech';
import { ConstructionGestureAdapter } from '../../input/ConstructionGestureAdapter';
import type { BuildPointerAction } from '../../input/ActionState';
import { ConstructionController3D } from './ConstructionController3D';
import { SceneManager } from './SceneManager';
import { initializePhysics, PhysicsWorld } from './PhysicsWorld';
import { AudioManager } from './AudioManager';
import { MarbleRun3DUI, button, escapeHtml } from './MarbleRun3DUI';
import { SaveManager } from './SaveManager';
import { example } from './examples';
import { definition } from './TrackPieceRegistry';
import { GAME_MODES, raceReplay } from './GameModeManager';
import { APPEARANCES, CATEGORIES, PHYSICS, type TrackPiece, type Vec3 } from './types';
import type { CameraMode } from './CameraManager';

export class MarbleRun3DGame {
  readonly builder = new ConstructionController3D();
  readonly ui = new MarbleRun3DUI();
  private readonly gestures = new ConstructionGestureAdapter(this.ui.host, actions);
  private readonly saves = new SaveManager();
  private readonly audio = new AudioManager(this.ui.menu.root, () => preferences.current.muted);
  private view: SceneManager | undefined;
  private physics: PhysicsWorld | undefined;
  private disposed = false;
  private count = 1;
  private tutorialStep = -1;
  private uiTime = 0;
  private step = 0.5;
  private rotationStep = Math.PI / 4;
  private drag:
    | {
        original: TrackPiece;
        anchor: Vec3;
        axis?: 'x' | 'y' | 'z';
        draft: TrackPiece;
        changed: boolean;
      }
    | undefined;

  constructor(private readonly leave: () => void) {
    this.builder.state = example();
    this.refresh();
    void this.start();
  }
  private async start(): Promise<void> {
    try {
      await initializePhysics();
      if (this.disposed) return;
      this.view = new SceneManager(this.ui.host, this.builder, () => this.contextLost());
      this.physics = new PhysicsWorld(this.builder.state, this.view.factory);
      this.view.overview();
      this.ui.query('[data-loading]').hidden = true;
      try {
        if (localStorage.getItem('little-games.marble-tutorial') !== 'seen') {
          this.tutorialStep = 0;
          this.ui.tutorial(0);
        }
      } catch {
        this.tutorialStep = 0;
        this.ui.tutorial(0);
      }
      this.sync();
    } catch (error) {
      console.error('Marble Studio could not start', error);
      this.ui.query('[data-loading]').innerHTML =
        '<strong>The 3D toy box could not open.</strong><p>This game needs WebGL 2. Try reopening it in a current browser.</p>';
      this.ui.status('3D could not start. Use Games to return.');
      this.physics?.dispose();
      this.physics = undefined;
    }
  }
  private contextLost(): void {
    if (this.physics) this.physics.playing = false;
    this.audio.silence();
    this.ui.query('[data-loading]').hidden = false;
    this.ui.query('[data-loading]').innerHTML =
      '<strong>The 3D view needs a rest.</strong><p>Save your run, then return to Games and open Marble Studio again.</p>';
  }
  update(delta: number): void {
    if (this.disposed || document.hidden) return;
    const action = this.ui.menu.readActivation();
    if (action) this.activate(action);
    if (this.disposed) return;
    if (actions.wasPressed('cancel')) {
      if (this.ui.modal) this.ui.closeModal();
      else if (this.builder.preview) {
        this.builder.cancel();
        this.refresh();
      } else this.leave();
    }
    if (actions.wasPressed('pause') && !this.ui.modal && this.physics) {
      this.physics.playing = !this.physics.playing;
      this.refresh();
    }
    const gesture = actions.consumeViewGesture();
    const pointers = actions.consumeBuildPointers();
    if (!this.ui.modal) {
      if (gesture) this.view?.camera.gesture(gesture);
      for (const pointer of pointers) this.pointer(pointer);
      const seconds = Math.min(delta / 1000, 0.05);
      this.physics?.advance(seconds);
      if (this.physics) {
        for (const event of this.physics.events.splice(0)) {
          this.audio.play(event);
          if (event.text) this.ui.status(event.text);
        }
        const rolling =
          this.physics.playing &&
          this.physics.marbles.some((m) => {
            if (!m.active || m.body.isSleeping()) return false;
            const velocity = m.body.linvel();
            return (
              velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z > 0.1
            );
          });
        this.audio.tick(seconds, rolling);
      }
    }
    if (this.physics && this.view) {
      this.view.showSelection(
        this.builder,
        this.ui.advanced,
        this.drag?.changed ? this.drag.draft : undefined,
      );
      this.view.frame(
        Math.min(delta / 1000, 0.05),
        this.physics,
        preferences.current.reducedMotion,
        this.builder.state.marble.trails,
        this.builder.state.marble.glow,
      );
      this.uiTime += delta;
      if (this.uiTime > 300) {
        this.uiTime = 0;
        this.refresh();
      }
    }
  }
  private pointer(action: BuildPointerAction): void {
    if (!this.view) return;
    if (action.phase === 'cancel') {
      this.drag = undefined;
      return;
    }
    if (this.builder.preview) {
      if (action.phase === 'start' || action.phase === 'move') {
        const p = this.view.projectToPlane(action.x, action.y, this.builder.preview.position);
        if (p) {
          this.builder.updatePreview(p);
          this.refresh();
        }
      }
      return;
    }
    if (action.phase === 'start') {
      const hit = this.view.pick(action.x, action.y);
      if (hit.piece) this.builder.selected = hit.piece;
      if (!hit.piece && !hit.axis) {
        this.builder.selected = undefined;
        this.refresh();
        return;
      }
      const piece = this.builder.selection;
      if (!piece) return;
      const anchor = this.view.projectToPlane(action.x, action.y, piece.position, hit.axis === 'y');
      this.drag = anchor
        ? {
            original: structuredClone(piece),
            draft: structuredClone(piece),
            anchor,
            changed: false,
            ...(hit.axis ? { axis: hit.axis } : {}),
          }
        : undefined;
      this.refresh();
    } else if (action.phase === 'move' && this.drag) {
      const d = this.drag,
        point = this.view.projectToPlane(action.x, action.y, d.original.position, d.axis === 'y');
      if (!point) return;
      const delta = new Vector3(...point).sub(new Vector3(...d.anchor));
      if (delta.length() < 0.08) return;
      const position = d.original.position.map((v, i) => {
        if (d.axis && i !== (d.axis === 'x' ? 0 : d.axis === 'y' ? 1 : 2)) return v;
        const n = v + delta.getComponent(i);
        return this.builder.grid ? Math.round(n * 2) / 2 : n;
      }) as Vec3;
      d.draft.position = position;
      d.changed = true;
    } else if (action.phase === 'end' && this.drag) {
      if (this.drag.changed) {
        this.builder.moveSelected(this.drag.draft.position);
        this.sync();
      }
      this.drag = undefined;
    }
  }
  private activate(action: string): void {
    if (action === 'library') {
      this.leave();
      return;
    }
    if (action === 'modal:close') {
      this.ui.closeModal();
      return;
    }
    if (action === 'mute') {
      preferences.toggleMute();
      this.refresh();
      return;
    }
    if (action.startsWith('tutorial')) {
      this.tutorial(action);
      return;
    }
    if (action === 'examples') {
      this.ui.showExamples();
      return;
    }
    if (action.startsWith('example:')) {
      this.builder.load(example(Number(action.slice(8))));
      this.physics?.reset();
      this.sync();
      this.view?.overview();
      this.ui.closeModal();
      return;
    }
    if (action === 'saves') {
      this.ui.showSaves(this.saves);
      return;
    }
    if (action === 'save:current') {
      const name = this.ui.query<HTMLInputElement>('#mr-run-name').value;
      try {
        this.saves.save(name, this.builder.state, this.view?.thumbnail() ?? '');
        this.ui.showSaves(this.saves);
        this.ui.text('[data-save-status]', 'Saved! Your run is safe on this device.');
      } catch {
        this.ui.text(
          '[data-save-status]',
          'This device could not save. Storage may be full or unavailable. Your current run is still here.',
        );
      }
      return;
    }
    if (action.startsWith('load:')) {
      const run = this.saves.list().find((r) => r.id === action.slice(5));
      if (run) {
        this.builder.load(run.data);
        this.physics?.reset();
        this.sync();
        this.ui.closeModal();
        this.ui.status(`Opened ${run.name}.`);
      }
      return;
    }
    if (action.startsWith('delete-save:')) {
      try {
        this.saves.delete(action.slice(12));
        this.ui.showSaves(this.saves);
      } catch {
        this.ui.text('[data-save-status]', 'This device could not delete that save.');
      }
      return;
    }
    if (action === 'settings' || action.startsWith('setting:')) {
      this.settings(action);
      return;
    }
    if (action === 'properties' || action.startsWith('property:')) {
      this.properties(action);
      return;
    }
    if (action === 'game-mode') {
      this.showModes();
      return;
    }
    if (action.startsWith('pan:')) {
      this.view?.camera.pan(
        action === 'pan:left' ? -2 : action === 'pan:right' ? 2 : 0,
        action === 'pan:up' ? -2 : action === 'pan:down' ? 2 : 0,
      );
      this.ui.closeModal();
      return;
    }
    if (action.startsWith('game:')) {
      const mode = GAME_MODES.find((m) => m.id === action.slice(5));
      if (mode) {
        this.builder.edit((s) => {
          s.gameMode = mode.id;
        });
        this.ui.closeModal();
        this.refresh();
        this.ui.status(mode.description);
      }
      return;
    }
    if (action === 'race:replay') {
      if (this.physics) raceReplay(this.physics);
      this.ui.closeModal();
      this.refresh();
      return;
    }
    if (action === 'clear') {
      this.ui.openModal(
        'A fresh little adventure?',
        `<p>This clears the building table. You can bring it back with Undo.</p>${button('clear:yes', 'Start an empty run', 'mr-primary mr-wide')}`,
        'clear',
      );
      return;
    }
    if (action === 'clear:yes') {
      this.builder.edit((s) => {
        s.pieces = [];
        s.connections = [];
      });
      this.builder.cancel();
      this.physics?.reset();
      this.sync();
      this.ui.closeModal();
      return;
    }
    if (action.startsWith('category:')) {
      const category = CATEGORIES.find((c) => c === action.slice(9));
      if (category) {
        this.ui.category = category;
        this.ui.renderPalette();
      }
      return;
    }
    if (action.startsWith('piece:')) {
      this.gestures.orbit = false;
      this.ui.pressed('orbit-drag', false);
      this.builder.choose(action.slice(6));
      speak(definition(action.slice(6)).name, preferences.current.muted);
      this.ui.status('Your new piece is see-through. Move it, then tap Add piece.');
      this.refresh();
      return;
    }
    if (action.startsWith('mode:')) {
      this.builder.edit((s) => {
        s.buildMode = action === 'mode:free' ? 'free' : 'snap';
      });
      if (this.builder.preview) this.builder.updatePreview(this.builder.preview.position);
      this.ui.status(
        action === 'mode:free'
          ? 'Free build: put your pieces anywhere.'
          : 'Snap together: look for a green connection dot.',
      );
      this.refresh();
      return;
    }
    if (action === 'place') {
      const snapped = !!this.builder.snap;
      if (this.builder.place()) {
        this.audio.play({ kind: 'click', note: snapped ? 76 : 68, text: '' });
        this.ui.status(
          snapped ? 'Click! A perfect connection.' : 'A new piece for your adventure!',
        );
        this.sync();
      } else this.ui.status('The toy box holds up to 160 pieces. Try removing one.');
      return;
    }
    if (action === 'cancel-piece') {
      this.builder.cancel();
      this.refresh();
      return;
    }
    if (action === 'select-next') {
      const pieces = this.builder.state.pieces;
      const index = pieces.findIndex((p) => p.id === this.builder.selected);
      this.builder.preview = undefined;
      this.builder.snap = undefined;
      this.builder.selected = pieces[(index + 1) % Math.max(1, pieces.length)]?.id;
      this.refresh();
      return;
    }
    if (action === 'focus-piece') {
      const piece = this.builder.preview ?? this.builder.selection;
      if (piece && this.view) {
        this.view.camera.preferences.target = [...piece.position];
        this.view.camera.preferences.distance = 12;
        this.view.camera.view('orbit');
      }
      return;
    }
    if (action === 'undo' || action === 'redo') {
      this.builder[action]();
      this.sync();
      return;
    }
    if (action === 'duplicate') {
      this.builder.duplicate();
      this.refresh();
      return;
    }
    if (action === 'delete') {
      this.builder.delete();
      this.sync();
      return;
    }
    if (action === 'grid') {
      this.builder.grid = !this.builder.grid;
      this.refresh();
      return;
    }
    if (action === 'gizmo') {
      this.ui.advanced = !this.ui.advanced;
      this.refresh();
      return;
    }
    if (action.startsWith('move:') || action.startsWith('rotate:')) {
      const [kind, axis, sign] = action.split(':');
      if (axis === 'x' || axis === 'y' || axis === 'z')
        this.builder.transform(
          axis,
          Number(sign) * (kind === 'rotate' ? this.rotationStep : this.step),
          kind === 'rotate',
        );
      this.sync();
      return;
    }
    if (action.startsWith('scale:')) {
      const p = this.builder.preview ?? this.builder.selection;
      if (p && definition(p.type).scalable) {
        const scale = Math.max(0.1, Math.min(10, p.scale + Number(action.slice(6)) * 0.25));
        if (this.builder.preview) this.builder.preview.scale = scale;
        else
          this.builder.edit((s) => {
            const selected = s.pieces.find((q) => q.id === p.id);
            if (selected) selected.scale = scale;
          });
        this.sync();
      }
      return;
    }
    if (action === 'play' && this.physics) {
      this.physics.playing = !this.physics.playing;
      if (!this.physics.playing) this.audio.silence();
    }
    if (action === 'reset') {
      this.physics?.reset();
      this.ui.status('Ready for another roll.');
    }
    if (action === 'release') {
      if (!this.builder.state.pieces.some((p) => definition(p.type).paths.length))
        this.ui.status('Add a track or a dispenser, then let’s roll!');
      else {
        this.physics?.release(this.count);
        this.ui.status('Here come the marbles!');
      }
    }
    if (action.startsWith('count:')) this.count = Number(action.slice(6));
    if (action === 'continuous' && this.physics) {
      this.physics.continuous = !this.physics.continuous;
      this.physics.playing = true;
    }
    if (action === 'overview') this.view?.overview();
    if (action.startsWith('camera:')) {
      const mode = action.slice(7) as CameraMode;
      if (preferences.current.reducedMotion && (mode === 'follow' || mode === 'pov'))
        this.ui.status(
          'Follow cameras rest in still view. Turn still view off in Settings to follow.',
        );
      else {
        this.view?.camera.view(mode);
        this.ui.status(
          mode === 'follow' || mode === 'pov'
            ? 'Let’s roll! Tap ⇥ to follow another marble.'
            : 'Two fingers turn the view. Pinch to get closer.',
        );
      }
    }
    if (action === 'next-marble' && this.view) this.view.camera.following++;
    if (action === 'zoom:in' || action === 'zoom:out')
      this.view?.camera.gesture({
        rotateX: 0,
        rotateY: 0,
        zoom: action === 'zoom:in' ? 0.15 : -0.15,
      });
    if (action === 'orbit-drag') {
      this.gestures.orbit = !this.gestures.orbit;
      this.ui.pressed('orbit-drag', this.gestures.orbit);
      this.ui.text(
        '[data-help]',
        this.gestures.orbit
          ? 'One finger turns the camera · Tap Turn view again to build'
          : 'One finger builds · Two fingers turn · Pinch to zoom',
      );
    }
    this.refresh();
  }
  private settings(action: string): void {
    if (action.startsWith('setting:')) {
      const key = action.slice(8),
        m = this.builder.state.marble;
      if (key === 'muted') preferences.toggleMute();
      else if (key === 'motion') {
        preferences.toggleReducedMotion();
        if (preferences.current.reducedMotion) this.view?.camera.view('orbit');
      } else if (key === 'volume') this.audio.volume = cycle([0, 0.25, 0.5, 1], this.audio.volume);
      else if (key === 'music') this.audio.music = !this.audio.music;
      else if (key === 'step') this.step = cycle([0.25, 0.5, 1], this.step);
      else if (key === 'rotation')
        this.rotationStep = cycle([Math.PI / 12, Math.PI / 4, Math.PI / 2], this.rotationStep);
      else
        this.builder.edit((s) => {
          if (key === 'physics') s.physics = cycle(Object.keys(PHYSICS), s.physics);
          if (key === 'appearance') s.marble.appearance = cycle([...APPEARANCES], m.appearance);
          if (key === 'size') s.marble.size = cycle([0.12, 0.18, 0.24, 0.3], m.size);
          if (key === 'mass') s.marble.mass = cycle([0.5, 1, 2, 4], m.mass);
          if (key === 'bounce') s.marble.bounce = cycle([0.05, 0.12, 0.4, 0.7], m.bounce);
          if (key === 'trails') s.marble.trails = !m.trails;
          if (key === 'glow') s.marble.glow = !m.glow;
          if (key === 'limit') s.marble.limit = cycle([20, 40, 80], m.limit);
        });
      this.sync();
    }
    const { marble, physics } = this.builder.state;
    this.ui.openModal(
      'A few little choices',
      `<div class="mr-settings-grid">${[
        ['physics', `Gravity & feel: ${physics}`],
        ['appearance', `Marble: ${marble.appearance}`],
        ['size', `Size: ${Math.round(marble.size * 100)} mm`],
        ['mass', `Mass: ${marble.mass}×`],
        ['bounce', `Bounciness: ${Math.round(marble.bounce * 100)}%`],
        ['trails', `Trails: ${marble.trails ? 'on' : 'off'}`],
        ['glow', `Glow: ${marble.glow ? 'on' : 'off'}`],
        ['limit', `Marble limit: ${marble.limit}`],
        ['muted', `Sound: ${preferences.current.muted ? 'off' : 'on'}`],
        ['volume', `Volume: ${Math.round(this.audio.volume * 100)}%`],
        ['music', `Little melody: ${this.audio.music ? 'on' : 'off'}`],
        ['motion', `Still view: ${preferences.current.reducedMotion ? 'on' : 'off'}`],
        ['step', `Move step: ${this.step}`],
        ['rotation', `Turn step: ${Math.round((this.rotationStep / Math.PI) * 180)}°`],
      ]
        .map(([key, text]) => button(`setting:${key}`, text!))
        .join(
          '',
        )}</div><p>Tap a choice to change it. Still view keeps the camera steady and hides trails. New marbles use the chosen size and appearance.</p><div class="mr-two">${button('pan:left', '← Pan left')}${button('pan:right', 'Pan right →')}${button('pan:up', '↑ Pan back')}${button('pan:down', '↓ Pan forward')}</div>`,
      'settings',
    );
  }
  private properties(action: string): void {
    const p = this.builder.selection;
    if (!p) return;
    if (action.startsWith('property:')) {
      const key = action.slice(9);
      if (key === 'release') {
        this.physics?.release(1, p.id);
        this.ui.closeModal();
        return;
      }
      this.builder.edit((s) => {
        const piece = s.pieces.find((q) => q.id === p.id)!;
        if (key === 'note')
          piece.settings.note = piece.settings.note >= 84 ? 48 : piece.settings.note + 2;
        if (key === 'strength')
          piece.settings.strength = cycle([2, 5, 8, 12], piece.settings.strength);
        if (key === 'enabled') piece.settings.enabled = !piece.settings.enabled;
        if (key === 'color')
          piece.settings.color = cycle(
            ['red', 'blue', 'green', 'yellow', 'orange', 'purple'],
            piece.settings.color,
          );
        if (key === 'link')
          piece.settings.link = cycle(
            [
              '',
              ...s.pieces
                .filter((q) => q.id !== piece.id && definition(q.type).behavior)
                .map((q) => q.id),
            ],
            piece.settings.link,
          );
      });
      this.sync();
      if (key === 'note') this.audio.play({ kind: 'bell', note: p.settings.note, text: '' });
    }
    const piece = this.builder.selection;
    const def = definition(piece.type),
      behavior = def.behavior;
    const link = this.builder.state.pieces.find((q) => q.id === piece.settings.link);
    const choices: string[] = [];
    if (behavior)
      choices.push(
        button('property:enabled', `${piece.settings.enabled ? '● On' : '○ Off'} · Tap to switch`),
      );
    if (behavior === 'bell' || behavior === 'drum')
      choices.push(
        button(
          'property:note',
          `♫ Note: ${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][piece.settings.note % 12]}${Math.floor(piece.settings.note / 12) - 1}`,
        ),
      );
    if (['spring', 'trampoline', 'conveyor', 'magnet', 'wheel'].includes(behavior ?? ''))
      choices.push(button('property:strength', `Strength: ${piece.settings.strength}`));
    if (behavior === 'sorter' || behavior === 'collector')
      choices.push(button('property:color', `◇ Match color: ${piece.settings.color}`));
    if (['trigger', 'switch', 'teleporter'].includes(behavior ?? ''))
      choices.push(
        button(
          'property:link',
          `⚡ Link: ${link ? `${definition(link.type).name} #${this.builder.state.pieces.indexOf(link) + 1}` : 'none'}`,
        ),
      );
    if (def.paths.length) choices.push(button('property:release', '● Start a marble here'));
    this.ui.openModal(
      escapeHtml(def.name),
      `<p>Piece #${this.builder.state.pieces.indexOf(piece) + 1} · Position ${piece.position.map((n) => n.toFixed(1)).join(', ')}</p><div class="mr-settings-grid">${choices.join('')}</div><p>${['trigger', 'switch'].includes(behavior ?? '') ? 'A marble toggles the linked machine. Tap Link to choose which one.' : behavior === 'gate' ? 'On lifts the gate. Off lowers it to hold the marbles.' : behavior === 'teleporter' ? 'Choose another portal as its link. An unlinked portal uses the next portal.' : behavior === 'sorter' ? 'Matching marbles go left; other colors go right. Add a matching bin to each exit.' : behavior === 'counter' ? `Marbles counted: ${this.physics?.pieces.get(piece.id)?.hits ?? 0}` : 'Move, turn, copy, or remove this piece with the build controls.'}</p>`,
      'properties',
    );
  }
  private showModes(): void {
    const results = this.physics?.results ?? [];
    this.ui.openModal(
      'Choose an adventure',
      `<div class="mr-example-grid">${GAME_MODES.map((m) => button(`game:${m.id}`, `<span class="mr-example-icon">${m.icon}</span><strong>${m.title}</strong><span>${m.description}</span>`)).join('')}</div>${this.builder.state.gameMode === 'race' ? `<h3>The finish line</h3><ol class="mr-results">${results.map((r) => `<li>Lane ${r.source + 1} · ${r.time.toFixed(2)} seconds</li>`).join('') || '<li>Add a finish line, then release your marbles.</li>'}</ol>${button('race:replay', '↺ Race again', 'mr-primary mr-wide')}` : ''}`,
      'modes',
    );
  }
  private tutorial(action: string): void {
    if (action === 'tutorial') this.tutorialStep = 0;
    else if (action === 'tutorial:next')
      this.tutorialStep = this.tutorialStep >= 4 ? -1 : this.tutorialStep + 1;
    else this.tutorialStep = -1;
    if (this.tutorialStep < 0) {
      try {
        localStorage.setItem('little-games.marble-tutorial', 'seen');
      } catch {
        /* Playing works when storage is unavailable. */
      }
    }
    this.ui.tutorial(this.tutorialStep);
  }
  private sync(): void {
    this.physics?.sync(this.builder.state);
    this.view?.sync(this.builder);
    this.refresh();
  }
  private refresh(): void {
    this.ui.refresh(this.builder, this.physics, this.count, preferences.current.muted);
  }
  dispose(): void {
    stopSpeaking();
    this.disposed = true;
    this.gestures.destroy();
    this.audio.dispose();
    this.physics?.dispose();
    this.view?.dispose();
    this.ui.destroy();
  }
}
function cycle<T>(choices: T[], current: T): T {
  return choices[(choices.indexOf(current) + 1) % choices.length]!;
}
