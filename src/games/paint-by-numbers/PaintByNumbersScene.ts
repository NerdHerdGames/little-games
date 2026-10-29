import Phaser from 'phaser';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { PaintAdapter } from '../../input/PaintAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import {
  ART_HEIGHT,
  ART_WIDTH,
  CATEGORIES,
  COLORS,
  PICTURES,
  thumbnail,
  type CategoryId,
  type Picture,
} from './art';
import { PaintSurface } from './PaintSurface';
import { BRUSH_SIZES } from './rules';
import './style.css';

const button = (action: string, label: string, extra = ''): string =>
  `<button type="button" data-action="${action}" ${extra}>${label}</button>`;

export class PaintByNumbersScene extends Phaser.Scene {
  private menu!: ActionMenu;
  private adapter: PaintAdapter | undefined;
  private surface: PaintSurface | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private current: Picture | undefined;
  private category: CategoryId | undefined;
  private screen: 'categories' | 'pictures' | 'painting' = 'categories';
  private selected = 1;
  private radius: number = BRUSH_SIZES[1];
  private leaving = false;
  private resetPending = false;

  constructor() {
    super('PaintByNumbers');
  }

  create(): void {
    this.category = undefined;
    this.current = undefined;
    this.surface = undefined;
    this.canvas = undefined;
    this.leaving = false;
    this.resetPending = false;
    this.radius = BRUSH_SIZES[1];
    this.menu = new ActionMenu(actions, 'paint-game', 'Paint by Numbers');
    this.showCategories();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.adapter?.destroy();
      this.adapter = undefined;
      this.surface = undefined;
      this.canvas = undefined;
      this.current = undefined;
      this.menu.destroy();
    });
  }

  update(): void {
    if (this.leaving) return;
    if (actions.wasPressed('cancel')) {
      this.back();
      return;
    }
    // Finish queued strokes with the color active when the stroke was made.
    const segments = actions.consumePaint();
    if (this.screen === 'painting' && this.surface && segments.length) {
      let completed = false;
      for (const segment of segments)
        if (this.surface.stroke(segment, this.selected, this.radius).length) completed = true;
      this.surface.draw();
      if (completed) {
        playPlacementTone(preferences.current.muted);
        this.refreshProgress();
      }
    }
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
  }

  private header(title: string, description: string, back: string): string {
    return `<header class="paint-header"><div><p class="paint-eyebrow">LITTLE GAMES · THE COLOR STUDIO</p><h1>${title}</h1><p class="paint-intro">${description}</p></div><nav aria-label="Game controls">${button('mute', preferences.current.muted ? 'Sound off' : 'Sound on', `aria-pressed="${preferences.current.muted}"`)}${button('back', back)}</nav></header>`;
  }

  private showCategories(): void {
    this.adapter?.destroy();
    this.adapter = undefined;
    this.screen = 'categories';
    this.menu.setContent(
      `${this.header('A little color. A lot of possibility.', 'Pick a collection. Find a picture. Make it yours.', 'Game Library')}<div class="paint-gallery-heading"><h2>What will you color today?</h2><span>4 collections · ${PICTURES.length} pictures</span></div><div class="paint-category-grid">${CATEGORIES.map(
        (category) => {
          const pictures = PICTURES.filter((p) => p.category === category.id);
          const cover =
            pictures.find((p) =>
              ['saturn', 'school-bus', 'butterfly', 'breakfast'].includes(p.id),
            ) ?? pictures[0]!;
          return `<button type="button" class="paint-category" data-action="category:${category.id}" style="--card-color:${category.color}"><div class="paint-cover">${thumbnail(cover)}</div><div class="paint-card-copy"><span class="paint-count">${pictures.length} PICTURES</span><h2>${category.title}</h2><p>${category.subtitle}</p><span class="paint-card-arrow" aria-hidden="true">↗</span></div></button>`;
        },
      ).join(
        '',
      )}</div><p class="paint-footer">One number, one color. Take your time and enjoy the little details.</p>`,
    );
  }

  private showPictures(category: CategoryId): void {
    this.adapter?.destroy();
    this.adapter = undefined;
    this.screen = 'pictures';
    this.category = category;
    const collection = CATEGORIES.find((c) => c.id === category)!;
    this.menu.setContent(
      `${this.header(collection.title, 'Choose a picture to bring to life.', 'Collections')}<div class="paint-gallery-heading"><h2>Your next little masterpiece</h2><span>${PICTURES.filter((p) => p.category === category).length} pictures</span></div><div class="paint-picture-grid">${PICTURES.filter(
        (p) => p.category === category,
      )
        .map(
          (p) =>
            `<button type="button" class="paint-picture" data-action="picture:${p.id}" style="--card-color:${collection.color}"><div class="paint-cover">${thumbnail(p)}</div><div class="paint-card-copy"><h2>${p.title}</h2><span>${this.current?.id === p.id ? 'Continue coloring' : 'Let’s color'} <span aria-hidden="true">↗</span></span></div></button>`,
        )
        .join('')}</div>`,
    );
  }

  private showPainting(picture: Picture, restart = false): void {
    this.adapter?.destroy();
    this.screen = 'painting';
    this.resetPending = false;
    const reuse = !restart && this.current?.id === picture.id && this.canvas && this.surface;
    this.current = picture;
    this.category = picture.category;
    const colors = [...new Set(picture.regions.map((r) => r.color))].sort((a, b) => a - b);
    if (!reuse || !colors.includes(this.selected)) this.selected = colors[0]!;
    this.menu
      .setContent(`${this.header(picture.title, 'Pick a number on the right. Drag to color the same number.', 'Pictures')}
      <div class="paint-tools"><div class="paint-brushes" role="group" aria-label="Brush size"><span>Brush size</span>${BRUSH_SIZES.map((size, i) => button(`brush:${size}`, `<span class="paint-brush-dot" style="width:${12 + i * 9}px;height:${12 + i * 9}px"></span><span class="paint-sr-only">${['Small', 'Medium', 'Large'][i]} brush</span>`, `aria-pressed="${size === this.radius}"`)).join('')}</div><span class="paint-brush-help">Stay curious. The outlines keep your colors inside.</span>${button('reset', 'Start over')}</div>
      <div class="paint-workspace"><section class="paint-paper" aria-label="Numbered coloring picture"><div class="paint-art"><canvas width="${ART_WIDTH}" height="${ART_HEIGHT}" role="img" aria-label="${picture.title}. White sections with numbers. Drag a matching color inside each section." aria-describedby="paint-instruction"></canvas><svg viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}" class="paint-details" aria-hidden="true"><g stroke="#344757" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="#344757" font-family="Arial" font-size="22" text-anchor="middle">${picture.details.join('')}</g></svg></div><div class="paint-celebration" hidden><span aria-hidden="true">✦</span><h2>Look what you made!</h2><p>Every number has found its color.</p>${button('back', 'Choose another picture')}</div></section>
      <aside class="paint-palette" aria-label="Numbered color palette"><h2>Your colors</h2><p id="paint-instruction">Choose, then color.</p><div class="paint-swatches">${colors
        .map((number) => {
          const color = COLORS[number - 1]!;
          return button(
            `color:${number}`,
            `<span class="paint-color-chip" style="background:${color.hex}"><b>${number}</b></span><span class="paint-color-name">${color.name}</span><span class="paint-color-check" aria-hidden="true"></span>`,
            `class="paint-swatch" aria-label="Color ${number}, ${color.name}" aria-pressed="${this.selected === number}"`,
          );
        })
        .join(
          '',
        )}</div><div class="paint-progress"><strong data-progress-count></strong><progress value="0" max="1" aria-label="Completed sections"></progress><p data-color-status role="status" aria-live="polite"></p></div></aside></div>
      <div class="paint-reset" hidden role="dialog" aria-modal="true" aria-labelledby="paint-reset-title"><div><h2 id="paint-reset-title">Start this picture again?</h2><p>This will clear the colors on this picture.</p>${button('keep', 'Keep coloring')}${button('clear', 'Clear picture')}</div></div>`);
    const placeholder = this.menu.root.querySelector<HTMLCanvasElement>('canvas')!;
    if (reuse) placeholder.replaceWith(this.canvas!);
    else {
      this.canvas = placeholder;
      this.surface = new PaintSurface(placeholder, picture);
    }
    this.adapter = new PaintAdapter(this.canvas!, actions);
    this.refreshProgress();
  }

  private refreshProgress(): void {
    const painting = this.surface!.painting;
    const count = this.menu.root.querySelector('[data-progress-count]');
    if (count)
      count.textContent = `${painting.complete.size} / ${painting.visibleRegions.length} sections`;
    const progress = this.menu.root.querySelector('progress');
    if (progress) progress.value = painting.progress;
    const allDone = painting.progress === 1;
    this.menu.root.querySelector('.paint-celebration')?.toggleAttribute('hidden', !allDone);
    for (const color of COLORS.keys()) {
      const number = color + 1;
      const swatch = this.menu.root.querySelector(`[data-action="color:${number}"]`);
      const ids = painting.visibleRegions.filter((id) => painting.colors[id] === number);
      const done = ids.length > 0 && ids.every((id) => painting.complete.has(id));
      swatch?.setAttribute('aria-pressed', String(this.selected === number));
      swatch?.classList.toggle('is-finished', done);
      const check = swatch?.querySelector('.paint-color-check');
      if (check) check.textContent = done ? '✓' : '';
      if (swatch)
        swatch.setAttribute(
          'aria-label',
          `Color ${number}, ${COLORS[color]!.name}${done ? ', all sections complete' : ''}`,
        );
    }
    const status = this.menu.root.querySelector('[data-color-status]');
    const remaining = painting.visibleRegions.filter(
      (id) => painting.colors[id] === this.selected && !painting.complete.has(id),
    ).length;
    if (status)
      status.textContent = allDone
        ? 'Picture complete!'
        : `${remaining} section${remaining === 1 ? '' : 's'} for number ${this.selected}`;
    this.menu.refreshButtons();
  }

  private activate(id: string): void {
    if (this.resetPending && !['keep', 'clear'].includes(id)) return;
    if (id === 'back') this.back();
    else if (id === 'mute') {
      preferences.toggleMute();
      const control = this.menu.root.querySelector('[data-action="mute"]');
      if (control) {
        control.textContent = preferences.current.muted ? 'Sound off' : 'Sound on';
        control.setAttribute('aria-pressed', String(preferences.current.muted));
      }
    } else if (id.startsWith('category:')) this.showPictures(id.slice(9) as CategoryId);
    else if (id.startsWith('picture:')) {
      const p = PICTURES.find((p) => p.id === id.slice(8));
      if (p) this.showPainting(p);
    } else if (id.startsWith('color:')) {
      this.selected = Number(id.slice(6));
      this.refreshProgress();
    } else if (id.startsWith('brush:')) {
      this.radius = Number(id.slice(6));
      for (const size of BRUSH_SIZES)
        this.menu.root
          .querySelector(`[data-action="brush:${size}"]`)
          ?.setAttribute('aria-pressed', String(this.radius === size));
    } else if (id === 'reset') this.toggleReset(true);
    else if (id === 'keep') this.toggleReset(false);
    else if (id === 'clear' && this.current) this.showPainting(this.current, true);
  }

  private toggleReset(open: boolean): void {
    this.resetPending = open;
    actions.clearPaint();
    this.menu.root.querySelector('.paint-reset')?.toggleAttribute('hidden', !open);
    for (const selector of ['.paint-header', '.paint-tools', '.paint-workspace']) {
      const element = this.menu.root.querySelector<HTMLElement>(selector);
      if (element) element.inert = open;
    }
    if (open) {
      this.adapter?.destroy();
      this.adapter = undefined;
    } else if (this.canvas) this.adapter = new PaintAdapter(this.canvas, actions);
    this.menu.refreshButtons();
    this.menu.root
      .querySelector<HTMLButtonElement>(`[data-action="${open ? 'keep' : 'reset'}"]`)
      ?.focus();
  }

  private back(): void {
    if (this.resetPending) {
      this.toggleReset(false);
      return;
    }
    if (this.screen === 'painting' && this.category) this.showPictures(this.category);
    else if (this.screen === 'pictures') this.showCategories();
    else {
      this.leaving = true;
      this.adapter?.destroy();
      goToScene(this, 'GameHub');
    }
  }
}
