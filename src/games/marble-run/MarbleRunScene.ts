import Phaser from 'phaser';
import { actions, preferences } from '../../core/services';
import { goToScene } from '../../core/SceneTransitions';
import { ConstructionAdapter } from '../../input/ConstructionAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import { RunAudio } from './audio';
import { CameraController } from './camera';
import { ConstructionController } from './construction';
import { disconnect } from './connections';
import { SaveManager } from './document';
import { example } from './examples';
import { MarblePhysics } from './physics';
import { getDefinition } from './registry';
import { colorSymbol, RunRenderer } from './render';
import { clamp, defaultDocument, uid, type Experience } from './types';
import { button, colorOptions, escapeHtml, examplesPanel, palette, pieceName, shell } from './ui';
import './style.css';

type Simulation = 'build' | 'running' | 'paused';
/** Phaser owns lifecycle; shared actions drive a responsive, native HTML/canvas workshop. */
export class MarbleRunScene extends Phaser.Scene {
  private menu!: ActionMenu;
  private adapter!: ConstructionAdapter;
  private marblePhysics!: MarblePhysics;
  private runRenderer!: RunRenderer;
  private editor!: ConstructionController;
  private audio!: RunAudio;
  private saves!: SaveManager;
  private camera = new CameraController();
  private simulation: Simulation = 'build';
  private category = 'Tracks';
  private leaving = false;
  private follow = false;
  private guide = 0;
  private panel = '';
  private saveName = 'My marble run';
  private uiSignature = '';
  private dirty = false;
  private draftClock = 0;
  private firstSize = true;
  constructor() {
    super('MarbleRun');
  }
  create(): void {
    this.leaving = false;
    this.simulation = 'build';
    this.follow = false;
    this.panel = '';
    this.category = 'Tracks';
    this.uiSignature = '';
    this.camera = new CameraController();
    this.dirty = false;
    this.firstSize = true;
    this.menu = new ActionMenu(actions, 'marble-run', 'Marble Run Builder');
    this.menu.setContent(shell());
    this.audio = new RunAudio(this.menu.root);
    try {
      this.saves = new SaveManager(localStorage);
    } catch {
      this.saves = new SaveManager({
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage unavailable');
        },
      });
    }
    this.guide = this.saves.guided() ? 0 : 1;
    this.editor = new ConstructionController(
      this.saves.restore() ?? example('first'),
      this.camera,
      () => this.changed(),
      (message) => this.announce(message),
    );
    const canvas = this.menu.root.querySelector<HTMLCanvasElement>('[data-board]')!;
    this.runRenderer = new RunRenderer(canvas, this.camera);
    this.adapter = new ConstructionAdapter(this.menu.root, canvas, actions);
    this.marblePhysics = new MarblePhysics((event) => {
      this.audio.feedback(event);
      if (event.kind === 'finish')
        this.announce(
          `${colorSymbol(event.marble?.color ?? '')} First to the finish! Roll again whenever you like.`,
        );
      if (event.kind === 'switch') this.announce('Click! The switch changed the gates.');
    });
    this.marblePhysics.rebuild(this.editor.document);
    this.refreshGuide();
    this.refresh();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.persist();
      this.adapter.destroy();
      this.marblePhysics.destroy();
      this.audio.destroy();
      this.menu.destroy();
    });
  }
  update(_time: number, delta: number): void {
    if (this.leaving) return;
    let activation = actions.consumeActivation();
    while (activation) {
      this.activate(activation);
      if (this.leaving) return;
      activation = actions.consumeActivation();
    }
    let action = actions.consumeConstruction();
    while (action) {
      this.editor.handle(action, this.simulation === 'build' && !this.panel);
      action = actions.consumeConstruction();
    }
    if (actions.wasPressed('cancel')) {
      if (this.panel) this.closePanel();
      else if (this.editor.brush) {
        this.editor.brush = undefined;
        this.editor.cancel();
      } else if (this.simulation === 'running') this.simulation = 'paused';
    }
    if (actions.wasPressed('pause')) this.togglePlay();
    if (this.runRenderer.resize() && this.firstSize) {
      this.firstSize = false;
      this.camera.fit(this.editor.document.pieces);
    }
    if (this.simulation === 'running' && !document.hidden && !this.panel) {
      this.marblePhysics.step(delta);
      if (this.follow && !preferences.current.reducedMotion) {
        const marble = this.marblePhysics.marbles[0];
        if (marble) {
          const t = 1 - Math.exp(-Math.min(delta, 50) / 180);
          this.camera.x += (marble.body.position.x - this.camera.x) * t;
          this.camera.y += (marble.body.position.y - this.camera.y) * t;
        }
      }
    }
    this.runRenderer.draw(
      {
        document: this.editor.document,
        selected: this.editor.selected,
        preview: this.editor.preview,
        snapTarget: this.editor.snap?.target,
        invalid: this.editor.invalid,
        building: this.simulation === 'build',
        reduced: preferences.current.reducedMotion,
      },
      this.marblePhysics,
    );
    this.refresh();
    this.draftClock += delta;
    if (this.dirty && this.draftClock > 1000) {
      this.persist();
      this.draftClock = 0;
    }
  }
  private changed(): void {
    this.marblePhysics.rebuild(this.editor.document);
    this.simulation = 'build';
    this.follow = false;
    this.dirty = true;
    this.audio.click();
    this.uiSignature = '';
    if (this.guide === 1) {
      this.guide = 2;
      this.refreshGuide();
    }
  }
  private persist(): void {
    if (!this.editor) return;
    try {
      this.saves.draft(this.editor.document);
      this.dirty = false;
    } catch {
      this.dirty = false;
      this.announce('Browser storage is full or unavailable. You can keep playing in this visit.');
    }
  }
  private announce(message: string): void {
    const node = this.menu.root.querySelector('[data-status]');
    if (node) node.textContent = message;
  }
  private text(selector: string, value: string): void {
    const node = this.menu.root.querySelector(selector);
    if (node) node.textContent = value;
  }
  private togglePlay(): void {
    this.editor.cancel();
    this.editor.brush = undefined;
    this.simulation = this.simulation === 'running' ? 'paused' : 'running';
    this.announce(
      this.simulation === 'running'
        ? 'Let gravity do its thing! Tap Roll to add marbles.'
        : 'Taking a little break. Tap Play to carry on.',
    );
  }
  private roll(count: number): void {
    this.editor.cancel();
    this.editor.brush = undefined;
    this.simulation = 'running';
    this.closePanel();
    this.marblePhysics.dispense(count);
    if (this.guide) {
      this.guide = 0;
      this.saves.finishGuide();
      this.refreshGuide();
    }
    this.announce(
      this.editor.document.experience === 'race'
        ? 'And they’re off! All starts released together.'
        : 'Here they go! Tap Build when you want to change your run.',
    );
  }
  private activate(id: string): void {
    if (id === 'library') {
      this.persist();
      this.leaving = true;
      this.menu.root.style.pointerEvents = 'none';
      goToScene(this, 'GameHub');
      return;
    }
    if (id === 'close') {
      this.closePanel();
      return;
    }
    if (id === 'mute') {
      preferences.toggleMute();
      this.uiSignature = '';
      return;
    }
    if (id === 'motion') {
      preferences.toggleReducedMotion();
      this.uiSignature = '';
      return;
    }
    if (id.startsWith('value:')) {
      const [, key, ...parts] = id.split(':');
      this.setValue(key!, decodeURIComponent(parts.join(':')));
      return;
    }
    if (id === 'play') return this.togglePlay();
    if (id === 'edit') {
      this.simulation = 'build';
      this.marblePhysics.rebuild(this.editor.document);
      this.announce('Your workshop is ready. Pick, drag or turn a piece.');
      return;
    }
    if (id === 'one' || id === 'five') return this.roll(id === 'one' ? 1 : 5);
    if (id === 'stream') {
      if (this.marblePhysics.stream) this.marblePhysics.stream = false;
      else {
        this.roll(1);
        this.marblePhysics.stream = true;
      }
      return;
    }
    if (id === 'reset') {
      this.marblePhysics.rebuild(this.editor.document);
      this.announce('Marbles cleared. Your track is ready for another run.');
      return;
    }
    if (id === 'race-again') {
      this.marblePhysics.rebuild(this.editor.document);
      this.roll(1);
      return;
    }
    if (id === 'fit') {
      this.follow = false;
      this.camera.fit(this.editor.document.pieces);
      return;
    }
    if (id === 'home') {
      this.follow = false;
      this.camera.fit([]);
      return;
    }
    if (id === 'zoom-in' || id === 'zoom-out') {
      this.camera.zoomAt(id === 'zoom-in' ? 0.2 : -0.2);
      return;
    }
    if (id === 'follow') {
      this.follow = !this.follow;
      if (preferences.current.reducedMotion && this.follow)
        this.announce(
          'Follow is available with gentle motion. Still view keeps the camera steady.',
        );
      return;
    }
    if (id === 'grid') {
      this.editor.document.grid = !this.editor.document.grid;
      this.dirty = true;
      return;
    }
    if (id === 'settings') return this.openPanel('settings', this.settingsContent());
    if (id === 'shelf') return this.openShelf();
    if (id === 'examples') return this.openPanel('examples', examplesPanel());
    if (id === 'help') {
      this.closePanel();
      this.guide = 1;
      this.refreshGuide();
      return;
    }
    if (id === 'guide-ramp') {
      this.editor.choose('ramp');
      return;
    }
    if (id === 'guide-done') {
      this.guide = 0;
      this.saves.finishGuide();
      this.refreshGuide();
      return;
    }
    if (id === 'clear' || id === 'empty')
      return this.openPanel(
        'clear',
        `<h2>A fresh canvas?</h2><p>Clear the board and marbles. You can bring your pieces back with Undo.</p>${button('confirm-clear', 'Clear board', 'mr-primary mr-wide')}${button('close', 'Keep building', 'mr-wide')}`,
      );
    if (id === 'confirm-clear') {
      this.editor.replace({
        ...defaultDocument(),
        mode: this.editor.document.mode,
        marbles: this.editor.document.marbles,
      });
      this.closePanel();
      return;
    }
    if (id === 'save') {
      try {
        this.saves.save(this.saveName, this.editor.document, uid());
        this.announce('Saved to your creations shelf on this device.');
        this.openShelf();
      } catch (error) {
        this.announce(error instanceof Error ? error.message : 'Could not save this creation.');
      }
      return;
    }
    if (id.startsWith('load:')) {
      const run = this.saves.list().find((r) => r.id === id.slice(5));
      if (run) {
        this.editor.replace(run.document);
        this.closePanel();
        this.announce(`Opened “${run.name}”. Undo restores your previous board.`);
      }
      return;
    }
    if (id.startsWith('remove:')) {
      try {
        this.saves.remove(id.slice(7));
        this.openShelf();
      } catch {
        this.announce('This browser could not remove the save.');
      }
      return;
    }
    if (id.startsWith('example:')) {
      this.editor.replace(example(id.slice(8)));
      this.closePanel();
      return;
    }
    if (id === 'palette-back' || id === 'palette-next') {
      const palette = this.menu.root.querySelector<HTMLElement>('[data-palette]')!;
      const horizontal = palette.scrollWidth > palette.clientWidth;
      const distance =
        (id === 'palette-back' ? -1 : 1) *
        (horizontal ? palette.clientWidth * 0.75 : palette.clientHeight * 0.75);
      palette.scrollBy({
        left: horizontal ? distance : 0,
        top: horizontal ? 0 : distance,
        behavior: preferences.current.reducedMotion ? 'instant' : 'smooth',
      });
      return;
    }
    if (id.startsWith('category:')) {
      this.category = id.slice(9);
      this.menu.root.querySelector('[data-palette]')!.innerHTML = palette(this.category);
      this.menu.refreshButtons();
      this.uiSignature = '';
      return;
    }
    if (this.simulation !== 'build') {
      this.announce('Tap Build to change your pieces.');
      return;
    }
    if (id.startsWith('choose:')) {
      this.editor.choose(id.slice(7));
      return;
    }
    if (id === 'snap' || id === 'free') {
      this.editor.cancel();
      this.editor.document.mode = id;
      this.dirty = true;
      this.announce(
        id === 'snap'
          ? 'Snap together: bring two empty ends close to connect.'
          : 'Free build: put pieces wherever your idea takes you.',
      );
      return;
    }
    if (id === 'select') {
      this.editor.cancel();
      this.editor.brush = undefined;
      return;
    }
    if (id === 'undo') {
      this.editor.undo();
      return;
    }
    if (id === 'redo') {
      this.editor.redo();
      return;
    }
    if (id === 'rotate-left' || id === 'rotate-right') {
      this.editor.rotate(id === 'rotate-left' ? -1 : 1);
      return;
    }
    if (id === 'duplicate') return this.editor.duplicate();
    if (id === 'delete') return this.editor.delete();
    if (id === 'reconnect') return this.editor.reconnect();
    if (id === 'piece-settings' && this.editor.selection)
      return this.openPanel('piece', this.pieceContent());
  }
  private refresh(): void {
    const doc = this.editor.document,
      selected = this.editor.selection,
      building = this.simulation === 'build';
    const signature = [
      selected?.id,
      this.editor.brush,
      this.simulation,
      doc.mode,
      doc.grid,
      this.marblePhysics.marbles.length,
      this.marblePhysics.queued,
      doc.pieces.length,
      this.editor.history.canUndo,
      this.editor.history.canRedo,
      this.category,
      this.marblePhysics.stream,
      this.follow,
      preferences.current.muted,
      preferences.current.reducedMotion,
    ].join('|');
    this.text('[data-zoom]', `${Math.round(this.camera.zoom * 100)}%`);
    if (signature === this.uiSignature) return;
    this.uiSignature = signature;
    this.text(
      '[data-count]',
      `${doc.pieces.length} pieces · ${this.marblePhysics.marbles.length} marbles`,
    );
    this.text(
      '[data-selection]',
      selected
        ? pieceName(selected.type)
        : this.editor.brush
          ? `${pieceName(this.editor.brush)} · tap to place`
          : 'Pick a piece',
    );
    this.text(
      '[data-phase]',
      this.simulation === 'build'
        ? '✎ BUILDING'
        : this.simulation === 'paused'
          ? 'Ⅱ PAUSED'
          : '● ROLLING',
    );
    this.text('[data-action="play"]', this.simulation === 'running' ? 'Ⅱ Pause' : '▶ Play');
    this.text('[data-action="mute"]', preferences.current.muted ? '♪̸' : '♪');
    this.text(
      '[data-board-hint]',
      this.editor.brush
        ? 'Tap to place · ☝ to select again'
        : building
          ? 'Drag pieces to build · drag empty space to pan · pinch to zoom'
          : 'Watch them roll · tap Build to change your creation',
    );
    for (const mode of ['snap', 'free']) this.pressed(mode, doc.mode === mode);
    for (const category of ['Tracks', 'Movers', 'Play'])
      this.pressed(`category:${category}`, this.category === category);
    for (const action of ['duplicate', 'delete', 'reconnect', 'piece-settings'])
      this.disable(action, !building || !selected);
    for (const action of ['rotate-left', 'rotate-right'])
      this.disable(action, !building || (!selected && !this.editor.brush && !this.editor.preview));
    this.disable('undo', !building || !this.editor.history.canUndo);
    this.disable('redo', !building || !this.editor.history.canRedo);
    for (const action of ['snap', 'free']) this.disable(action, !building);
    this.pressed('edit', building);
    this.pressed('grid', doc.grid);
    this.pressed('stream', this.marblePhysics.stream);
    this.pressed('follow', this.follow);
    this.pressed('motion', preferences.current.reducedMotion);
    this.pressed('mute', !preferences.current.muted);
    for (const b of this.menu.root.querySelectorAll<HTMLButtonElement>('[data-build-piece]')) {
      b.disabled = !building;
      b.setAttribute('aria-pressed', String(b.dataset.buildPiece === this.editor.brush));
    }
    this.menu.root.dataset.simulation = this.simulation;
  }
  private pressed(action: string, pressed: boolean): void {
    const b = this.menu.root.querySelector(`[data-action="${action}"]`);
    b?.setAttribute('aria-pressed', String(pressed));
    b?.classList.toggle('is-active', pressed);
  }
  private disable(action: string, disabled: boolean): void {
    const b = this.menu.root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (b) b.disabled = disabled;
  }
  private openPanel(name: string, content: string): void {
    this.editor.cancel();
    this.panel = name;
    const p = this.menu.root.querySelector<HTMLElement>('[data-panel]')!;
    p.hidden = false;
    p.innerHTML = `<div class="mr-panel-card" role="dialog" aria-modal="true" aria-label="${name === 'piece' ? 'Piece settings' : name === 'settings' ? 'Marble settings' : name === 'shelf' ? 'Saved creations' : name === 'clear' ? 'Clear board' : 'Example tracks'}"><div class="mr-panel-top"><span class="mr-eyebrow">YOUR LITTLE WORKSHOP</span>${button('close', '×', 'mr-icon', 'Close panel')}</div>${content}</div>`;
    this.menu.refreshButtons();
    p.querySelector<HTMLElement>('button')?.focus();
    // The board and toolbars are inert while a native control panel is open.
    for (const part of this.menu.root.children)
      if (part !== p && !part.matches('[data-status]')) part.setAttribute('inert', '');
  }
  private closePanel(): void {
    if (!this.panel) return;
    this.panel = '';
    this.menu.root.querySelector<HTMLElement>('[data-panel]')!.hidden = true;
    for (const part of this.menu.root.children) part.removeAttribute('inert');
    this.menu.refreshButtons();
    this.uiSignature = '';
  }
  private settingsContent(): string {
    const doc = this.editor.document,
      m = doc.marbles;
    return `<h2>A marble of your own.</h2><p>Try a different marble. See what happens!</p><div class="mr-fields">
    <label>Play idea<select data-setting="experience">${(['sandbox', 'race', 'music', 'sorting', 'chain'] as const).map((v, i) => `<option value="${v}" ${doc.experience === v ? 'selected' : ''}>${['Free sandbox', 'Marble race', 'Musical run', 'Color sorting', 'Chain reactions'][i]}</option>`).join('')}</select></label>
    <label>Gravity<select data-setting="gravity">${[
      [0.5, 'Low · floaty'],
      [1, 'Normal · Earth'],
      [1.6, 'High · speedy'],
    ]
      .map(([v, n]) => `<option value="${v}" ${doc.gravity === v ? 'selected' : ''}>${n}</option>`)
      .join('')}</select></label>
    <label>Color & symbol<select data-setting="color">${colorOptions(m.color)}</select></label>
    <label>Look<select data-setting="finish">${['glossy', 'metal', 'glass', 'stripe'].map((v) => `<option ${m.finish === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    ${this.range('size', 'Size', m.size, 7, 17, 1)}${this.range('weight', 'Weight', m.weight, 0.5, 3, 0.5)}${this.range('bounce', 'Bounce', m.bounce, 0, 0.9, 0.1)}${this.range('speed', 'Launch speed', m.speed, -8, 8, 1)}
    <label class="mr-check"><input type="checkbox" data-setting="trails" ${m.trails ? 'checked' : ''}/> Marble trails</label>
    ${this.range('volume', 'Sound volume', this.audio.volume, 0, 1, 0.1)}</div>
    <p class="mr-note">Races release all starts together. Color sorting catches matching symbols. Put down two portals with the same symbol to link them. Switch plates toggle all gates.</p>
    ${doc.experience === 'race' ? button('race-again', '⚑ Restart race', 'mr-primary mr-wide') : ''}${button('one', '● Try a marble', 'mr-primary mr-wide')}${button('help', 'Show the first steps', 'mr-wide')}`;
  }
  private range(
    key: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
  ): string {
    return `<label>${label} <output data-output="${key}">${value}</output><input aria-label="${label}" type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${value}"/></label>`;
  }
  private pieceContent(): string {
    const piece = this.editor.selection!,
      def = getDefinition(piece.type);
    return `<h2>${def.name}</h2><p>Tune this piece, then see what it does.</p><div class="mr-fields">
      ${def.scalable && this.editor.document.mode === 'free' ? this.range('piece-scale', 'Length', piece.scale, 0.5, 2.5, 0.1) : ''}
      ${def.mechanic ? `<label>Color & symbol<select data-setting="piece-color">${colorOptions(piece.props.color)}</select></label>` : ''}
      ${def.mechanic === 'bell' ? `<label>Musical note<select data-setting="piece-note">${['C', 'D', 'E', 'F', 'G', 'A', 'B', 'High C'].map((n, i) => `<option value="${i}" ${piece.props.note === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
      ${['spring', 'conveyor', 'moving', 'elevator', 'wheel', 'magnet', 'repeller', 'dispenser'].includes(def.mechanic ?? '') ? this.range('piece-power', 'Power', piece.props.power, 0.5, 2, 0.1) : ''}
      ${def.mechanic === 'gate' ? `<label class="mr-check"><input type="checkbox" data-setting="piece-open" ${piece.props.open ? 'checked' : ''}/> Start with gate open</label>` : ''}
      </div><p class="mr-note">${def.type === 'teleporter' ? 'Pair portals by choosing the same color and symbol.' : def.scalable ? 'Switch to Free Build to adjust this piece’s length.' : 'Move and rotate this piece using the controls below the board.'}</p>${button('close', 'Done ✓', 'mr-primary mr-wide')}`;
  }
  private setValue(key: string, value: string): void {
    const doc = this.editor.document,
      m = doc.marbles,
      n = Number(value);
    this.text(`[data-output="${key}"]`, value);
    if (key === 'name') {
      this.saveName = value.slice(0, 48);
      return;
    }
    if (key === 'volume') {
      this.audio.volume = clamp(n, 0, 1);
      return;
    }
    if (key === 'gravity') {
      doc.gravity = clamp(n, 0.3, 1.8);
      this.marblePhysics.setGravity(doc.gravity);
    } else if (key === 'experience') {
      doc.experience = value as Experience;
      this.marblePhysics.rebuild(doc);
    } else if (key === 'color') m.color = value;
    else if (key === 'finish') m.finish = value as typeof m.finish;
    else if (key === 'trails') m.trails = value === 'true';
    else if (['size', 'weight', 'bounce', 'speed'].includes(key)) {
      if (key === 'size') m.size = clamp(n, 7, 17);
      if (key === 'weight') m.weight = clamp(n, 0.5, 3);
      if (key === 'bounce') m.bounce = clamp(n, 0, 0.9);
      if (key === 'speed') m.speed = clamp(n, -8, 8);
    } else if (key.startsWith('piece-') && this.simulation === 'build' && this.editor.selection) {
      const piece = this.editor.selection;
      this.editor.mutate(() => {
        if (key === 'piece-scale') {
          piece.scale = clamp(n, 0.5, 2.5);
          doc.connections = disconnect(doc.connections, piece.id);
        }
        if (key === 'piece-color') piece.props.color = value;
        if (key === 'piece-note') piece.props.note = clamp(Math.round(n), 0, 7);
        if (key === 'piece-power') piece.props.power = clamp(n, 0.5, 2);
        if (key === 'piece-open') piece.props.open = value === 'true';
      });
    }
    this.dirty = true;
  }
  private openShelf(): void {
    const runs = this.saves.list();
    this.openPanel(
      'shelf',
      `<h2>Made by you.</h2><p>Your creations stay in this browser on this device.</p><label class="mr-save-name">Name your run<input data-setting="name" maxlength="48" value="${escapeHtml(this.saveName)}" aria-label="Creation name"/></label>${button('save', '＋ Save this creation', 'mr-primary mr-wide')}<div class="mr-saved-list">${runs.length ? runs.map((r) => `<div>${button(`load:${r.id}`, `<span class="mr-mini-run" aria-hidden="true">〰 ●</span><span><strong>${escapeHtml(r.name)}</strong><small>${r.document.pieces.length} pieces · ${new Date(r.updated).toLocaleDateString()}</small></span>`)}${button(`remove:${r.id}`, '×', 'mr-icon', `Remove saved run ${escapeHtml(r.name)}`)}</div>`).join('') : '<p>No saved runs yet. Your current board is also remembered automatically.</p>'}</div>`,
    );
  }
  private refreshGuide(): void {
    const guide = this.menu.root.querySelector<HTMLElement>('[data-guide]')!;
    guide.hidden = !this.guide;
    if (this.guide)
      guide.innerHTML = `<span class="mr-eyebrow">A LITTLE FIRST STEP · ${this.guide}/2</span><h3>${this.guide === 1 ? 'Give your marble a road.' : 'Ready to see it roll?'}</h3><p>${this.guide === 1 ? 'Drag a ramp from the toy box. Or choose one and tap the board.' : 'Tap Roll. Gravity takes care of the rest!'}</p><div>${button(this.guide === 1 ? 'guide-ramp' : 'one', this.guide === 1 ? '＋ Pick a ramp' : '● Roll a marble', 'mr-primary')}${button('guide-done', 'Got it')}</div>`;
    this.menu.refreshButtons();
  }
}
