import Phaser from 'phaser';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { MapPlacementAdapter } from '../../input/MapPlacementAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import {
  currentOrder,
  INGREDIENTS,
  isIngredient,
  nextOrder,
  ORDERS,
  serveOrder,
  stackIngredient,
  startOrder,
  undoIngredient,
  type Ingredient,
} from './rules';
import './style.css';

const ASSETS = `${import.meta.env.BASE_URL}assets/games/burger-order/`;
const LAYER_RISE: Record<Ingredient, number> = {
  'bottom-bun': 16,
  patty: 16,
  cheese: 10,
  tomato: 15,
  lettuce: 13,
  pickles: 11,
  'top-bun': 24,
};

const stackHeight = (stack: readonly Ingredient[]): number =>
  stack.slice(0, -1).reduce((bottom, ingredient) => bottom + LAYER_RISE[ingredient], 59);

function stackArt(stack: readonly Ingredient[], animate = false): string {
  let bottom = 0;
  const layers = stack.map((ingredient, index) => {
    const layer = `<img src="${ASSETS}${ingredient}.webp" alt="" draggable="false"
      class="burger-layer${animate && index === stack.length - 1 ? ' burger-layer-new' : ''}"
      data-ingredient="${ingredient}" style="bottom: ${bottom}%">`;
    bottom += LAYER_RISE[ingredient];
    return layer;
  });
  return layers.join('');
}

export class BurgerOrderScene extends Phaser.Scene {
  private gameState = startOrder();
  private menu!: ActionMenu;
  private leaving = false;

  constructor() {
    super('BurgerOrder');
  }

  create(): void {
    this.gameState = startOrder();
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'burger-order', 'Burger Order');
    this.menu.root.classList.toggle('burger-reduced-motion', preferences.current.reducedMotion);
    this.menu.setContent(`
      <header class="burger-header">
        <div class="burger-header-inner">
          <div class="burger-brand"><img src="${ASSETS}burger.webp" alt="">Burger Order</div>
          <nav aria-label="Game controls">
            <button type="button" data-action="mute">Sound on</button>
            <button type="button" data-action="library">Game Library</button>
          </nav>
        </div>
      </header>
      <div class="burger-workspace">
        <div class="burger-intro">
          <div><h1>Order up!</h1><p>Match the card and stack your burger from the bottom up.</p></div>
          <div class="burger-progress">
            <span data-order-count></span>
            <progress aria-label="Orders served" max="${ORDERS.length}" value="0"></progress>
          </div>
        </div>
        <div class="burger-board">
          <section class="burger-ticket" aria-labelledby="burger-ticket-title">
            <div class="burger-ticket-header"><h2 id="burger-ticket-title">Order card</h2></div>
            <h3 data-order-name></h3>
            <div class="burger-ticket-recipe">
              <div class="burger-ticket-art" data-order-art aria-hidden="true"></div>
              <ol reversed data-order-list aria-label="Ingredients from top to bottom"></ol>
            </div>
          </section>
          <section class="burger-station" aria-labelledby="burger-station-title">
            <div class="burger-station-header">
              <h2 id="burger-station-title">Build your burger</h2><span data-piece-count></span>
            </div>
            <div class="burger-counter">
              <div class="burger-plate" aria-hidden="true"></div>
              <div class="burger-drop-label" data-drop-label aria-hidden="true">＋ Drop pieces here</div>
              <div class="burger-stack burger-player-art" data-player-art role="img" aria-label="Empty plate"></div>
              <svg class="burger-drop-target" data-placement-map viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <rect width="100" height="100" fill="transparent" />
              </svg>
              <div class="burger-served" data-served hidden aria-hidden="true">✓ Served!</div>
            </div>
            <div class="burger-station-footer">
              <p class="burger-feedback" role="status" data-feedback>Start with the bottom bun.</p>
              <div class="burger-actions">
                <button class="burger-undo" type="button" data-action="undo" aria-label="Undo last piece">Undo</button>
                <button class="burger-serve" type="button" data-action="serve">Serve burger</button>
              </div>
            </div>
          </section>
        </div>
        <section class="burger-tray" aria-labelledby="burger-tray-title">
          <div class="burger-tray-header"><h2 id="burger-tray-title">Ingredients</h2><p>Tap or drag to stack</p></div>
          <div class="burger-ingredients">
            ${Object.entries(INGREDIENTS)
              .map(
                ([
                  id,
                  label,
                ]) => `<button type="button" class="burger-piece" data-action="add:${id}" data-piece="${id}">
                  <img src="${ASSETS}${id}.webp" alt="" draggable="false"><span>${label}</span>
                </button>`,
              )
              .join('')}
          </div>
        </section>
      </div>`);
    const adapter = new MapPlacementAdapter(this.menu.root, actions);
    this.renderOrder();
    this.renderStack();
    this.renderMute();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      adapter.destroy();
      this.menu.destroy();
    });
  }

  update(): void {
    if (this.leaving) return;
    if (actions.wasPressed('cancel')) {
      this.leave();
      return;
    }
    const placement = actions.consumePlacement();
    if (placement && isIngredient(placement.pieceId) && !this.gameState.served) {
      const { x, y } = placement;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) this.addPiece(placement.pieceId);
      else this.feedback('Drop the piece over the plate, or tap it to stack.');
    }
    const activation = this.menu.readActivation();
    if (activation) this.activate(activation);
  }

  private activate(activation: string): void {
    switch (activation) {
      case 'library':
        this.leave();
        break;
      case 'mute':
        preferences.toggleMute();
        this.renderMute();
        break;
      case 'undo':
        this.undoPiece();
        break;
      case 'serve':
        this.serve();
        break;
      default: {
        const ingredient = activation.slice(4);
        if (activation.startsWith('add:') && isIngredient(ingredient)) this.addPiece(ingredient);
      }
    }
  }

  private addPiece(ingredient: Ingredient): void {
    const next = stackIngredient(this.gameState, ingredient);
    if (next === this.gameState) {
      if (!next.served) this.feedback('Your burger is full. Serve it or undo the last piece.');
      return;
    }
    this.gameState = next;
    this.renderStack(true);
    this.feedback(
      next.stack.length === currentOrder(next).layers.length
        ? `${INGREDIENTS[ingredient]} added. Ready to serve!`
        : `${INGREDIENTS[ingredient]} added.`,
    );
    playPlacementTone(preferences.current.muted);
  }

  private undoPiece(): void {
    const ingredient = this.gameState.stack.at(-1);
    if (!ingredient) return;
    const undo = this.control('undo');
    const hadFocus = document.activeElement === undo;
    this.gameState = undoIngredient(this.gameState);
    this.renderStack();
    this.feedback(`${INGREDIENTS[ingredient]} removed.`);
    if (undo.disabled && hadFocus) this.control(`add:${ingredient}`).focus();
  }

  private serve(): void {
    if (this.gameState.served) {
      this.gameState = nextOrder(this.gameState);
      this.renderOrder();
      this.renderStack();
      this.feedback(`${currentOrder(this.gameState).name}. Start with the bottom bun.`);
      this.control('add:bottom-bun').focus({ preventScroll: true });
      return;
    }
    const result = serveOrder(this.gameState);
    if (result.kind === 'missing') {
      this.feedback(`Add ${result.count} more ${result.count === 1 ? 'piece' : 'pieces'}.`);
    } else if (result.kind === 'mismatch') {
      this.feedback(
        `Try the ${INGREDIENTS[result.ingredient].toLowerCase()} for layer ${result.layer}. Use Undo to fix it.`,
      );
    } else {
      this.gameState = result.game;
      this.renderStack();
      this.feedback(
        this.isLastOrder() ? 'All orders served. Nice work!' : 'Order served! It matches the card.',
      );
      this.control('serve').focus({ preventScroll: true });
      playPlacementTone(preferences.current.muted);
    }
  }

  private renderOrder(): void {
    const { name, layers } = currentOrder(this.gameState);
    this.element('[data-order-name]').textContent = name;
    this.element('[data-order-count]').textContent =
      `Order ${this.gameState.order + 1} of ${ORDERS.length}`;
    this.element('[data-order-art]').innerHTML =
      `<div class="burger-stack" style="--fit: ${Math.min(1, 135 / stackHeight(layers))}">${stackArt(layers)}</div>`;
    this.element('[data-order-list]').innerHTML = [...layers]
      .reverse()
      .map((ingredient) => `<li data-ingredient="${ingredient}">${INGREDIENTS[ingredient]}</li>`)
      .join('');
  }

  private renderStack(animate = false): void {
    const { order, stack, served } = this.gameState;
    const recipe = currentOrder(this.gameState).layers;
    const art = this.element('[data-player-art]');
    const height = Math.max(stackHeight(recipe), stackHeight(stack));
    art.style.setProperty('--height', String(height / 100));
    art.innerHTML = stackArt(stack, animate);
    art.setAttribute(
      'aria-label',
      stack.length
        ? `From bottom to top: ${stack.map((ingredient) => INGREDIENTS[ingredient]).join(', ')}`
        : 'Empty plate',
    );
    this.element('[data-drop-label]').hidden = stack.length > 0;
    this.element('[data-served]').hidden = !served;
    this.element('[data-piece-count]').textContent = `${stack.length} / ${recipe.length} pieces`;
    this.menu.root.querySelector('progress')!.value = order + Number(served);
    this.control('undo').disabled = served || !stack.length;
    this.control('serve').textContent = served
      ? this.isLastOrder()
        ? 'Play again'
        : 'Next order'
      : 'Serve burger';
    for (const button of this.menu.root.querySelectorAll<HTMLButtonElement>('[data-piece]')) {
      button.disabled = served;
    }
    this.menu.refreshButtons();
  }

  private renderMute(): void {
    const muted = preferences.current.muted;
    const button = this.control('mute');
    button.textContent = muted ? 'Sound off' : 'Sound on';
    button.setAttribute('aria-pressed', String(muted));
  }

  private feedback(message: string): void {
    this.element('[data-feedback]').textContent = message;
  }

  private control(action: string): HTMLButtonElement {
    return this.menu.root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  }

  private element(selector: string): HTMLElement {
    return this.menu.root.querySelector<HTMLElement>(selector)!;
  }

  private isLastOrder(): boolean {
    return this.gameState.order === ORDERS.length - 1;
  }

  private leave(): void {
    this.leaving = true;
    this.menu.root.inert = true;
    goToScene(this, 'GameHub');
  }
}
