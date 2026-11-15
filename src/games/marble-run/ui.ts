import { EXAMPLES } from './examples';
import { getDefinition, PIECES } from './registry';
import { COLORS, type PieceDefinition } from './types';
import { colorSymbol } from './render';
export const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export const button = (id: string, label: string, cls = '', title = label): string =>
  `<button type="button" data-action="${id}" class="${cls}" aria-label="${title}" title="${title}">${label}</button>`;
export function pieceIcon(def: PieceDefinition): string {
  if (def.paths.length)
    return `<svg viewBox="-160 -110 320 220" aria-hidden="true"><g fill="none" stroke="${def.color}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">${def.paths.map((path) => `<polyline points="${path.map((p) => `${p.x},${p.y}`).join(' ')}"/>`).join('')}</g></svg>`;
  return `<span class="mr-toy-symbol" style="color:${def.color}" aria-hidden="true">${def.icon}</span>`;
}
export function palette(category: string): string {
  return PIECES.filter((p) => p.category === category)
    .map(
      (p) =>
        `<button type="button" data-action="choose:${p.type}" data-build-piece="${p.type}" aria-label="${p.name}: drag or tap to choose">${pieceIcon(p)}<span>${p.name}</span></button>`,
    )
    .join('');
}
export const colorOptions = (selected: string): string =>
  COLORS.map(
    (c, i) =>
      `<option value="${c}" ${c === selected ? 'selected' : ''}>${colorSymbol(c)} ${['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Rainbow'][i]}</option>`,
  ).join('');
export function shell(): string {
  return `<header class="mr-header"><div class="mr-brand"><span class="mr-logo" aria-hidden="true"><i></i><i></i><i></i></span><div><span class="mr-eyebrow">LITTLE GAMES / THE TINKERING ROOM</span><h1>Marble Run <span>Builder</span></h1></div></div><nav aria-label="Game options">${button('mute', '♪', 'mr-icon', 'Toggle sound')}${button('motion', '✧', 'mr-icon', 'Toggle reduced motion')}${button('library', '← Games', 'mr-back')}</nav></header>
  <div class="mr-toolbar"><div class="mr-segment" aria-label="Construction mode">${button('snap', '⊞ Snap', 'is-active')}${button('free', '〰 Free')}</div><div class="mr-play-group">${button('edit', '✎ Build', 'mr-build')}${button('play', '▶ Play', 'mr-primary')}${button('one', '● Roll 1', 'mr-roll')}${button('five', '⁙ Roll 5', 'mr-roll')}${button('stream', '∞', 'mr-icon', 'Toggle a continuous marble stream')}${button('reset', '↺', 'mr-icon', 'Reset marbles')}</div><div class="mr-history">${button('undo', '↶', 'mr-icon', 'Undo')}${button('redo', '↷', 'mr-icon', 'Redo')}${button('shelf', '▤ Saves', 'mr-save')}</div></div>
  <div class="mr-workspace"><aside class="mr-palette"><div class="mr-palette-heading"><span class="mr-eyebrow">YOUR TOY BOX</span><h2>Let’s build.</h2></div><div class="mr-categories" aria-label="Piece categories">${['Tracks', 'Movers', 'Play'].map((c, i) => button(`category:${c}`, c, i === 0 ? 'is-active' : '')).join('')}</div><div class="mr-pieces" data-palette>${palette('Tracks')}</div><div class="mr-palette-pages" aria-label="More pieces">${button('palette-back', '‹', '', 'Previous pieces')}${button('palette-next', '›', '', 'More pieces')}</div><div class="mr-palette-foot"><span>Pick. Place. Play.</span><small>A little idea goes a long way.</small></div></aside>
  <main class="mr-board"><canvas data-board aria-label="Marble run construction board. Choose a piece, then tap or drag to place it."></canvas><div class="mr-board-heading"><span class="mr-board-badge" data-phase>✎ BUILDING</span><span data-count>0 pieces · 0 marbles</span></div><div class="mr-guide" data-guide hidden></div><div class="mr-camera" aria-label="Board view">${button('zoom-out', '−', 'mr-icon', 'Zoom out')}${button('zoom-in', '+', 'mr-icon', 'Zoom in')}${button('fit', '⛶', 'mr-icon', 'Fit entire run')}${button('home', '⌂', 'mr-icon', 'Reset camera')}${button('follow', '◎', 'mr-icon', 'Follow a marble')}</div><div class="mr-board-foot"><span data-board-hint>Drag a piece here. Make something wonderful.</span><span class="mr-zoom" data-zoom>100%</span></div></main></div>
  <footer class="mr-footer"><div class="mr-selection"><span class="mr-selection-dot"></span><div><small>ON THE BOARD</small><strong data-selection>Pick a piece</strong></div></div><div class="mr-piece-actions">${button('select', '☝', 'mr-icon', 'Select pieces or pan the board')}${button('rotate-left', '↶ 15°', '', 'Rotate left 15 degrees')}${button('rotate-right', '↷ 15°', '', 'Rotate right 15 degrees')}${button('duplicate', '⧉', '', 'Duplicate piece')}${button('delete', '⌫', '', 'Delete piece')}${button('reconnect', '⊕', '', 'Connect nearby endpoints')}${button('piece-settings', '⚙ Tune')}</div><div class="mr-more">${button('grid', '⊞', 'mr-icon', 'Toggle alignment grid')}${button('settings', '● Marbles')}${button('examples', '✦ Ideas')}${button('clear', '⌫', 'mr-icon', 'Clear the track')}</div></footer>
  <div class="mr-status" role="status" data-status>Welcome to your little marble workshop.</div>
  <div class="mr-panel" data-panel hidden></div>`;
}
export function examplesPanel(): string {
  return `<h2>A spark of inspiration.</h2><p>Choose a run, then make it your own. Undo brings your old run back.</p><div class="mr-example-list">${EXAMPLES.map((e) => button(`example:${e.id}`, `<span>${e.icon}</span><div><strong>${e.name}</strong><small>${e.description}</small></div>`)).join('')}</div>${button('empty', '＋ Empty board', 'mr-wide')}`;
}
export const pieceName = (type: string): string => getDefinition(type).name;
