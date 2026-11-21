import Phaser from 'phaser';
import { playPlacementTone } from '../../accessibility/FeedbackTone';
import { goToScene } from '../../core/SceneTransitions';
import { actions, preferences } from '../../core/services';
import { MapPlacementAdapter } from '../../input/MapPlacementAdapter';
import { ActionMenu } from '../../ui/ActionMenu';
import {
  BURGER_ORDERS,
  createKitchen,
  currentOrder,
  INGREDIENTS,
  isIngredient,
  nextLayer,
  placeLayer,
  serveOrder,
  takeNextOrder,
  undoLayer,
  type Ingredient,
} from './rules';
import './style.css';

const piece = (ingredient: Ingredient): string =>
  `<span class="burger-piece burger-piece--${ingredient}" aria-hidden="true"></span>`;

export class BurgerStackScene extends Phaser.Scene {
  private kitchen = createKitchen();
  private menu!: ActionMenu;
  private leaving = false;

  constructor() {
    super('BurgerStack');
  }

  create(): void {
    this.kitchen = createKitchen();
    this.leaving = false;
    this.menu = new ActionMenu(actions, 'burger-game', 'Burger Stack');
    this.menu.setContent(`
      <header class="burger-header">
        <button type="button" data-action="library"><span aria-hidden="true">‹</span> Game Library</button>
        <h1>Burger Stack</h1>
        <button type="button" data-action="mute"></button>
      </header>
      <div class="burger-layout">
        <section class="burger-ticket" aria-label="Order card">
          <p class="burger-order-number"></p>
          <h2 class="burger-order-name"></h2>
          <div class="burger-card-guide">
            <ol class="burger-recipe" aria-label="Order layers, bottom to top"></ol>
            <p class="burger-ticket-note"><span aria-hidden="true">↑</span> Start at the bottom</p>
          </div>
        </section>
        <section class="burger-board" aria-labelledby="burger-plate-title">
          <h2 id="burger-plate-title">Your plate</h2>
          <div class="burger-stage">
            <svg data-placement-map viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
            <div class="burger-plate" aria-hidden="true"></div>
            <div class="burger-stack" role="img"></div>
            <p class="burger-empty" aria-hidden="true">Stack here</p>
          </div>
          <p class="burger-feedback" role="status" aria-live="polite"></p>
          <div class="burger-controls">
            <button type="button" data-action="undo">Undo</button>
            <button type="button" data-action="serve">Serve burger</button>
          </div>
        </section>
        <section class="burger-tray" aria-labelledby="burger-tray-title">
          <div>
            <h2 id="burger-tray-title">Ingredients</h2>
            <p>Tap a piece or drag it to the plate.</p>
          </div>
          <div class="burger-ingredients">
            ${Object.entries(INGREDIENTS)
              .map(
                ([id, name]) => `<button type="button" data-action="${id}" data-piece="${id}">
                  ${piece(id as Ingredient)}<span>${name}</span>
                </button>`,
              )
              .join('')}
          </div>
        </section>
      </div>`);
    const adapter = new MapPlacementAdapter(this.menu.root, actions);
    this.renderCard();
    this.renderStack('Add the bottom bun first.');
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
    if (placement && isIngredient(placement.pieceId) && nextLayer(this.kitchen)) {
      const { x, y, pieceId } = placement;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) this.addLayer(pieceId);
      else this.setFeedback('Drop the piece over your plate.');
      return;
    }
    const action = this.menu.readActivation();
    if (action === 'library') this.leave();
    else if (action === 'mute') {
      preferences.toggleMute();
      this.renderMute();
    } else if (action === 'undo') {
      this.kitchen = undoLayer(this.kitchen);
      this.renderStack('Top layer removed.');
    } else if (action === 'serve') this.serveOrContinue();
    else if (action && isIngredient(action)) this.addLayer(action);
  }

  private addLayer(ingredient: Ingredient): void {
    const expected = nextLayer(this.kitchen);
    if (!expected) return;
    const updated = placeLayer(this.kitchen, ingredient);
    if (updated === this.kitchen) {
      this.setFeedback(`Look at the card. Next up: ${INGREDIENTS[expected].toLowerCase()}.`);
      return;
    }
    this.kitchen = updated;
    playPlacementTone(preferences.current.muted);
    if (nextLayer(this.kitchen)) {
      this.renderStack(`${INGREDIENTS[ingredient]} added.`);
    } else {
      this.renderStack('It matches! Ready to serve.');
      this.control('serve').focus({ preventScroll: true });
    }
  }

  private serveOrContinue(): void {
    if (this.kitchen.served) {
      this.kitchen = takeNextOrder(this.kitchen);
      this.renderCard();
      this.renderStack('New order! Start with the bottom bun.');
      this.control('bottom-bun').focus({ preventScroll: true });
      return;
    }
    this.kitchen = serveOrder(this.kitchen);
    if (this.kitchen.served) {
      this.renderStack(`${currentOrder(this.kitchen).name} served!`);
      playPlacementTone(preferences.current.muted);
    }
  }

  private renderCard(): void {
    const order = currentOrder(this.kitchen);
    this.menu.root.style.setProperty('--layers', String(order.layers.length));
    this.menu.root.querySelector('.burger-order-number')!.textContent =
      `Order ${this.kitchen.orderIndex + 1} of ${BURGER_ORDERS.length}`;
    this.menu.root.querySelector('.burger-order-name')!.textContent = order.name;
    this.menu.root.querySelector('.burger-recipe')!.innerHTML = order.layers
      .map(
        (id) =>
          `<li>${piece(id)}<span>${INGREDIENTS[id]}</span><span class="burger-check" aria-hidden="true">✓</span></li>`,
      )
      .join('');
  }

  private renderStack(message: string): void {
    const { stack, served } = this.kitchen;
    const ready = nextLayer(this.kitchen) === undefined;
    const stackView = this.menu.root.querySelector('.burger-stack')!;
    stackView.innerHTML = stack.map(piece).join('');
    stackView.setAttribute(
      'aria-label',
      stack.length
        ? `Burger from bottom to top: ${stack.map((id) => INGREDIENTS[id]).join(', ')}`
        : 'Empty plate',
    );
    this.menu.root.querySelector('.burger-empty')!.toggleAttribute('hidden', stack.length > 0);
    this.menu.root.classList.toggle('is-served', served);
    this.menu.root.querySelectorAll('.burger-recipe li').forEach((layer, index) => {
      layer.classList.toggle('is-placed', index < stack.length);
    });
    for (const button of this.menu.root.querySelectorAll<HTMLButtonElement>('button[data-piece]')) {
      button.disabled = ready;
    }
    const undo = this.control('undo');
    const restoreFocus = document.activeElement === undo && stack.length === 0;
    undo.disabled = served || stack.length === 0;
    const serve = this.control('serve');
    serve.disabled = !ready;
    serve.textContent = served ? 'Next order' : 'Serve burger';
    this.setFeedback(message);
    this.menu.refreshButtons();
    if (restoreFocus) this.control('bottom-bun').focus({ preventScroll: true });
  }

  private renderMute(): void {
    const mute = this.control('mute');
    mute.textContent = preferences.current.muted ? 'Sound off' : 'Sound on';
    mute.setAttribute('aria-label', 'Mute sound');
    mute.setAttribute('aria-pressed', String(preferences.current.muted));
  }

  private setFeedback(message: string): void {
    this.menu.root.querySelector('.burger-feedback')!.textContent = message;
  }

  private control(id: string): HTMLButtonElement {
    return this.menu.root.querySelector<HTMLButtonElement>(`[data-action="${id}"]`)!;
  }

  private leave(): void {
    this.leaving = true;
    this.menu.root.inert = true;
    goToScene(this, 'GameHub');
  }
}
