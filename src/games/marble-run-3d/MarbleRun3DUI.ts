import { ActionMenu } from '../../ui/ActionMenu';
import { actions } from '../../core/services';
import { CATEGORIES, type Category, type PieceDefinition } from './types';
import { PIECES, definition } from './TrackPieceRegistry';
import { EXAMPLES } from './examples';
import type { ConstructionController3D } from './ConstructionController3D';
import type { PhysicsWorld } from './PhysicsWorld';
import type { SaveManager } from './SaveManager';
import './style.css';

function symbols(text: string): string {
  const paths: Record<string, string> = {
    '↗': 'M5 19 19 5M6 5h13v13',
    Ⅱ: 'M8 5v14M16 5v14',
    '▶': 'M7 4 20 12 7 20Z',
    '▧': 'M4 4h16v16H4ZM4 15l5-5 6 6 3-3 2 2M15 8h1',
    '▣': 'M5 3h12l4 4v14H3V3ZM7 3v6h10V3M7 21v-8h10v8',
  };
  return text.replace(
    /[↗Ⅱ▶▧▣]/gu,
    (symbol) =>
      `<svg class="mr-symbol" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[symbol]}"/></svg>`,
  );
}
export const button = (action: string, text: string, cls = '', label = ''): string =>
  `<button type="button" data-action="${action}" class="${cls}"${label ? ` aria-label="${label}" title="${label}"` : ''}>${symbols(text)}</button>`;
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
const categoryIcons = ['━', '↶', '◯', '◎', '⌒', '⚙', '♫', '▥', '✿'];
function thumbnail(def: PieceDefinition): string {
  const color = `#${def.color.toString(16).padStart(6, '0')}`;
  if (def.paths.length && def.shape !== 'funnel') {
    const points = def.paths.flat().map((s) => ({
      x: s.position[0] * 0.8 + s.position[2] * 0.6,
      y: -s.position[1] * 0.8 + s.position[0] * 0.24 - s.position[2] * 0.32,
    }));
    const minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x)),
      minY = Math.min(...points.map((p) => p.y)),
      maxY = Math.max(...points.map((p) => p.y));
    const scale = Math.min(64 / Math.max(1, maxX - minX), 35 / Math.max(1, maxY - minY));
    const paths = def.paths.map((path) =>
      path
        .map(
          (s, i) =>
            `${i ? 'L' : 'M'}${(50 + (s.position[0] * 0.8 + s.position[2] * 0.6 - (minX + maxX) / 2) * scale).toFixed(1)},${(27 + (-s.position[1] * 0.8 + s.position[0] * 0.24 - s.position[2] * 0.32 - (minY + maxY) / 2) * scale).toFixed(1)}`,
        )
        .join(' '),
    );
    return `<svg viewBox="0 0 100 60" aria-hidden="true"><ellipse cx="50" cy="50" rx="31" ry="4" fill="#163e4b" opacity=".08"/>${paths.map((d) => `<path d="${d}" fill="none" stroke="#264d5a" stroke-opacity=".15" stroke-width="17" stroke-linecap="round" transform="translate(0,4)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="17" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".48" stroke-width="7" stroke-linecap="round"/>`).join('')}${def.behavior ? `<text x="78" y="22" font-size="18" fill="#234557">${def.icon}</text>` : ''}</svg>`;
  }
  return `<svg viewBox="0 0 100 60" aria-hidden="true"><ellipse cx="50" cy="52" rx="29" ry="4" fill="#163e4b" opacity=".08"/>${def.shape === 'funnel' ? `<path d="M19 16 L43 48 L57 48 L81 16" fill="${color}"/><ellipse cx="50" cy="16" rx="31" ry="9" fill="${color}"/><ellipse cx="50" cy="16" rx="24" ry="6" fill="#fff" opacity=".35"/>` : `<path d="M32 15 L53 8 L68 17 L68 47 L48 54 L32 44Z" fill="${color}"/><path d="M32 15 L48 23 L68 17 L53 8Z" fill="#fff" opacity=".4"/><path d="M48 23 L48 54 L68 47 L68 17Z" fill="#795b32" opacity=".14"/>`}</svg>`;
}

export class MarbleRun3DUI {
  readonly menu = new ActionMenu(actions, 'marble-run', '3D Marble Run Builder');
  readonly host: HTMLElement;
  category: Category = 'Tracks';
  advanced = false;
  modal = '';
  private returnFocus: HTMLElement | null = null;
  constructor() {
    this.menu.setContent(`
      <div data-shell class="mr-shell">
      <header class="mr-header">
        <div class="mr-brand"><span class="mr-brand-icon" aria-hidden="true"><i></i><i></i><i></i></span><div><span class="mr-eyebrow">LITTLE GAMES / THE PLAYROOM</span><h1>Marble Studio<span>3D</span></h1></div></div>
        <nav aria-label="Workshop tools">${button('undo', '↶', 'mr-icon-button', 'Undo')}${button('redo', '↷', 'mr-icon-button', 'Redo')}<span class="mr-divider"></span>${button('examples', '▧ <span>Ideas</span>')}${button('saves', '▣ <span>Save & load</span>')}${button('settings', '⚙', 'mr-icon-button', 'Settings')}${button('library', '⌂ <span>Games</span>')}</nav>
      </header>
      <main class="mr-workspace">
        <aside class="mr-toybox" aria-label="Component palette"><div class="mr-toybox-heading"><span class="mr-eyebrow">A BOX OF POSSIBILITIES</span><h2>Pick a piece <span>✧</span></h2></div>
          <div class="mr-categories" aria-label="Piece categories">${CATEGORIES.map((c, i) => button(`category:${c}`, `${categoryIcons[i]}<span>${c}</span>`, '', c)).join('')}</div>
          <div data-palette class="mr-palette" aria-label="Track pieces"></div>
          <div class="mr-toybox-note"><span>✦</span><p>A twist, a turn, a brand new idea.<br/>What will you make today?</p></div>
        </aside>
        <section class="mr-stage" aria-label="Construction area">
          <div data-view class="mr-view"></div>
          <div class="mr-stage-top"><div class="mr-mode-switch" aria-label="Construction mode">${button('mode:snap', '⌘ <span>Snap together</span>')}${button('mode:free', '✥ <span>Free build</span>')}</div><div class="mr-stage-chips"><span data-piece-count>0 pieces</span><span data-marble-count>0 marbles</span></div></div>
          <div data-loading class="mr-loading" role="status"><span class="mr-brand-icon"><i></i><i></i><i></i></span><strong>Opening the toy box…</strong></div>
          <div class="mr-camera-bar" aria-label="Camera controls">${button('overview', '⌖', '', 'See the whole run')}${button('camera:orbit', '↔', '', 'Orbit camera')}${button('camera:top', '▦', '', 'Top view')}${button('camera:front', '▤', '', 'Front view')}${button('camera:side', '◧', '', 'Side view')}${button('camera:follow', '◉', '', 'Follow a marble')}${button('camera:pov', '⊙', '', 'Marble point of view')}${button('next-marble', '⇥', '', 'Follow the next marble')}${button('zoom:in', '+', '', 'Zoom in')}${button('zoom:out', '−', '', 'Zoom out')}</div>
          <div data-tutorial class="mr-tutorial" hidden><span class="mr-eyebrow">LET’S TRY IT TOGETHER</span><strong data-tutorial-text></strong><div>${button('tutorial:next', 'Next →')}${button('tutorial:close', 'Got it', 'mr-subtle')}</div></div>
          <div class="mr-stage-bottom"><div class="mr-stage-hint"><span data-status role="status" aria-live="polite">Pick a piece. Make a little magic.</span><small data-help>One finger builds · Two fingers turn · Pinch to zoom</small></div>${button('orbit-drag', '✋ <span>Turn view</span>', 'mr-hand')}</div>
        </section>
        <aside class="mr-inspector" aria-label="Selected piece controls"><span class="mr-eyebrow">MAKE IT YOURS</span><h2 data-selected>Build & play</h2><p data-selected-help>Tap a piece in the toy box. A see-through piece shows where it will go.</p>
          <div class="mr-place-tools">${button('place', '＋ Add piece', 'mr-primary')}${button('cancel-piece', 'Cancel', 'mr-subtle')}</div>
          <div class="mr-two">${button('select-next', '→ Next piece')}${button('focus-piece', '⌖ Find piece')}</div>
          <div class="mr-transform"><span class="mr-control-label">MOVE YOUR PIECE</span><div class="mr-nudge-grid">${button('move:z:-1', '↑', '', 'Move backward')}${button('move:x:-1', '←', '', 'Move left')}${button('move:x:1', '→', '', 'Move right')}${button('move:z:1', '↓', '', 'Move forward')}</div><div class="mr-two">${button('move:y:1', '⇧ Raise')}${button('move:y:-1', '⇩ Lower')}</div><span class="mr-control-label">GIVE IT A TURN</span><div class="mr-two">${button('rotate:y:-1', '↶ Turn')}${button('rotate:y:1', '↷ Turn')}</div><details><summary>More ways to build</summary><div class="mr-two">${button('rotate:x:-1', '↶ Tilt X')}${button('rotate:x:1', '↷ Tilt X')}${button('rotate:z:-1', '↶ Roll Z')}${button('rotate:z:1', '↷ Roll Z')}${button('scale:-1', '− Smaller')}${button('scale:1', '+ Bigger')}${button('grid', '▦ Grid off')}${button('gizmo', '✥ Axes off')}</div></details><div class="mr-two mr-edit-tools">${button('duplicate', '▧ Copy')}${button('delete', '⌫ Delete')}</div>${button('properties', '⚙ Piece options', 'mr-wide')}</div>
          <div class="mr-play-mode"><span class="mr-control-label">TODAY’S ADVENTURE</span>${button('game-mode', '✦ Creative sandbox', 'mr-wide')}<p data-mode-help>Build anything you can imagine.</p></div>
          ${button('clear', '↺ Start a new run', 'mr-wide mr-subtle')}
        </aside>
      </main>
      <footer class="mr-playbar"><div class="mr-play-buttons">${button('play', 'Ⅱ', 'mr-pause', 'Pause marbles')}${button('reset', '↺', '', 'Reset marbles')}<span class="mr-divider"></span><div class="mr-release-options" aria-label="How many marbles">${button('count:1', '1')}${button('count:5', '5')}${button('count:10', '10')}</div>${button('release', '<span class="mr-ball-icon">●</span> Let’s roll! <span>↗</span>', 'mr-release')}${button('continuous', '∞', '', 'Continuous marbles')}</div><div class="mr-footer-note"><span class="mr-live-dot"></span><span data-run-summary>Ready when you are.</span>${button('mute', '♫', '', 'Toggle sound')}${button('tutorial', '?', '', 'Show the tutorial')}</div></footer>
      </div><div data-modal class="mr-modal-backdrop" hidden></div>`);
    this.host = this.query('[data-view]');
    this.renderPalette();
  }
  query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.menu.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing marble UI element ${selector}`);
    return element;
  }
  text(selector: string, value: string): void {
    const e = this.query(selector);
    if (e.textContent !== value) e.textContent = value;
  }
  status(message: string): void {
    this.text('[data-status]', message);
  }
  renderPalette(): void {
    this.query('[data-palette]').innerHTML = PIECES.filter((p) => p.category === this.category)
      .map((p) => button(`piece:${p.id}`, `${thumbnail(p)}<span>${p.name}</span>`, 'mr-piece'))
      .join('');
    for (const category of CATEGORIES)
      this.pressed(`category:${category}`, category === this.category);
    this.menu.refreshButtons();
  }
  pressed(action: string, value: boolean): void {
    this.menu.root
      .querySelector(`[data-action="${action}"]`)
      ?.setAttribute('aria-pressed', String(value));
  }
  disabled(action: string, value: boolean): void {
    const e = this.menu.root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (e) e.disabled = value;
  }
  refresh(
    builder: ConstructionController3D,
    physics: PhysicsWorld | undefined,
    count: number,
    muted: boolean,
  ): void {
    const piece = builder.preview ?? builder.selection;
    this.text('[data-selected]', piece ? definition(piece.type).name : 'Build & play');
    this.text(
      '[data-selected-help]',
      builder.preview
        ? builder.snap
          ? 'A perfect fit! Tap Add piece to connect.'
          : 'Move the preview, then tap Add piece.'
        : piece
          ? 'Drag your piece, or try the big arrows below.'
          : 'Tap a piece in the toy box. A see-through piece shows where it will go.',
    );
    this.text('[data-piece-count]', `${builder.state.pieces.length} pieces`);
    this.text('[data-marble-count]', `${physics?.activeCount ?? 0} marbles`);
    this.pressed('mode:snap', builder.state.buildMode === 'snap');
    this.pressed('mode:free', builder.state.buildMode === 'free');
    this.disabled('undo', !builder.canUndo);
    this.disabled('redo', !builder.canRedo);
    this.disabled('place', !builder.preview || builder.state.pieces.length >= 160);
    this.disabled('cancel-piece', !builder.preview);
    this.disabled('select-next', builder.state.pieces.length === 0);
    this.disabled('focus-piece', !piece);
    for (const action of ['duplicate', 'delete', 'properties'])
      this.disabled(action, !builder.selection || !!builder.preview);
    for (const control of this.menu.root.querySelectorAll<HTMLButtonElement>(
      '[data-action^="move:"], [data-action^="rotate:"]',
    ))
      control.disabled = !piece;
    this.disabled('scale:-1', !piece || !definition(piece.type).scalable);
    this.disabled('scale:1', !piece || !definition(piece.type).scalable);
    this.text('[data-action="grid"]', builder.grid ? '▦ Grid on' : '▦ Grid off');
    this.pressed('grid', builder.grid);
    this.text('[data-action="gizmo"]', this.advanced ? '✥ Axes on' : '✥ Axes off');
    this.pressed('gizmo', this.advanced);
    const play = this.query('[data-action="play"]');
    if (play.dataset.playing !== String(physics?.playing)) {
      play.innerHTML = symbols(physics?.playing ? 'Ⅱ' : '▶');
      play.dataset.playing = String(physics?.playing);
    }
    this.pressed('play', !physics?.playing);
    this.query('[data-action="play"]').setAttribute(
      'aria-label',
      physics?.playing ? 'Pause marbles' : 'Resume marbles',
    );
    this.pressed('continuous', physics?.continuous ?? false);
    this.pressed('mute', muted);
    this.text('[data-action="mute"]', muted ? '♩ Off' : '♫');
    for (const n of [1, 5, 10]) this.pressed(`count:${n}`, n === count);
    const modes = {
      creative: ['✦ Creative sandbox', 'Build anything you can imagine.'],
      race: [
        '⚑ Marble racing',
        'Release all starting gates together. First through a finish line wins.',
      ],
      music: ['♫ Musical run', 'Add bells, bars, and drums. Choose their notes in Piece options.'],
      sorting: [
        '◇ Color sorting',
        'Match marbles to colored bins. Set gate and bin colors in Piece options.',
      ],
      chain: [
        '⚡ Chain reactions',
        'Link a trigger to a machine in Piece options, then roll a marble.',
      ],
    };
    this.text('[data-action="game-mode"]', modes[builder.state.gameMode][0]!);
    this.text('[data-mode-help]', modes[builder.state.gameMode][1]!);
    if (physics) {
      const winner = physics.results[0];
      this.text(
        '[data-run-summary]',
        builder.state.gameMode === 'race' && winner
          ? `Winner: lane ${winner.source + 1} · ${winner.time.toFixed(2)}s`
          : builder.state.gameMode === 'sorting'
            ? `${physics.sorted} matched · ${physics.collected} collected`
            : physics.activeCount
              ? `${physics.activeCount} little marbles on an adventure`
              : 'Ready when you are.',
      );
    }
    this.menu.refreshButtons();
  }
  openModal(title: string, body: string, type: string): void {
    const previousAction =
      this.modal === type
        ? (document.activeElement as HTMLElement | null)?.dataset.action
        : undefined;
    const scroll =
      this.modal === type ? (this.menu.root.querySelector('.mr-dialog')?.scrollTop ?? 0) : 0;
    if (!this.modal) this.returnFocus = document.activeElement as HTMLElement | null;
    this.modal = type;
    const modal = this.query('[data-modal]');
    modal.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="mr-dialog-title" class="mr-dialog"><header><h2 id="mr-dialog-title">${title}</h2>${button('modal:close', '×', '', 'Close dialog')}</header>${body}</section>`;
    modal.hidden = false;
    this.query('[data-shell]').inert = true;
    this.menu.refreshButtons();
    const focus =
      [...modal.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.dataset.action === previousAction,
      ) ?? modal.querySelector<HTMLButtonElement>('button');
    focus?.focus();
    this.query('.mr-dialog').scrollTop = scroll;
  }
  closeModal(): void {
    this.query('[data-modal]').hidden = true;
    this.query('[data-modal]').replaceChildren();
    this.query('[data-shell]').inert = false;
    this.modal = '';
    this.menu.refreshButtons();
    this.returnFocus?.focus();
    this.returnFocus = null;
  }
  showExamples(): void {
    this.openModal(
      'A little inspiration',
      `<p>Pick a ready-to-roll run. Your current work stays in Undo.</p><div class="mr-example-grid">${EXAMPLES.map((name, i) => button(`example:${i}`, `<span class="mr-example-icon">${['↱', '♫', '⚑', '◎', '◇', '⚡'][i]}</span><strong>${name}</strong>`)).join('')}</div>`,
      'examples',
    );
  }
  showSaves(saves: SaveManager): void {
    this.openModal(
      'Your marble shelf',
      `<label class="mr-name-label" for="mr-run-name">Name your creation</label><input id="mr-run-name" maxlength="40" value="My marble run" autocomplete="off"/>${button('save:current', '▣ Save this run', 'mr-primary mr-wide')}<p data-save-status role="status">Up to 12 creations stay on this device. Use the same name to update a save.</p><div class="mr-save-list">${
        saves
          .list()
          .map(
            (run) =>
              `<article>${run.thumbnail ? `<img src="${escapeHtml(run.thumbnail)}" alt=""/>` : ''}<strong>${escapeHtml(run.name)}</strong><span>${run.data.pieces.length} pieces</span>${button(`load:${escapeHtml(run.id)}`, 'Open')}${button(`delete-save:${escapeHtml(run.id)}`, '⌫', '', `Delete ${escapeHtml(run.name)}`)}</article>`,
          )
          .join('') || '<p>Your next creation belongs here.</p>'
      }</div>`,
      'saves',
    );
  }
  tutorial(step: number): void {
    const steps = [
      '1 / 5 · Pick a yellow track from the toy box.',
      '2 / 5 · The green dot means it connects. Tap Add piece.',
      '3 / 5 · Open Interactive and add a marble dispenser.',
      '4 / 5 · Tap Let’s roll! to release a marble.',
      '5 / 5 · Watch it go! Try the ◉ camera to follow.',
    ];
    this.query('[data-tutorial]').hidden = step < 0;
    if (step >= 0) this.text('[data-tutorial-text]', steps[step] ?? steps[4]!);
  }
  destroy(): void {
    this.menu.destroy();
  }
}
