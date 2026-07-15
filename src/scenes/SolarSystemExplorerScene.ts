import Phaser from 'phaser';
import { speak, stopSpeaking } from '../accessibility/Speech';
import { goToScene } from '../core/SceneTransitions';
import { actions, preferences } from '../core/services';
import { SOLAR_SYSTEM_OBJECTS, type SolarSystemObject } from '../data/solarSystem';
import { addButton } from '../ui/button';
import { enablePannableSearchView } from '../ui/PannableSearchView';

const VIEW = { x: 285, y: 110, width: 950, height: 535 } as const;
const WORLD = { width: 3920, height: 1100 } as const;
// Allow the first and last objects to travel all the way to the crosshair.
const MIN_PAN_X = SOLAR_SYSTEM_OBJECTS[0].x - VIEW.width / 2;
const MAX_PAN_X = (SOLAR_SYSTEM_OBJECTS.at(-1)?.x ?? SOLAR_SYSTEM_OBJECTS[0].x) - VIEW.width / 2;

export class SolarSystemExplorerScene extends Phaser.Scene {
  private world!: Phaser.GameObjects.Container;
  private panX = 0;
  private panY = 270;
  private nameText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private selectionRing!: Phaser.GameObjects.Ellipse;
  private cleanupPan: (() => void) | undefined;

  constructor() {
    super('SolarSystemExplorer');
  }

  create(): void {
    this.panX = 0;
    this.panY = 270;
    this.cameras.main.setBackgroundColor('#071322');
    this.add.text(25, 22, 'Solar System Telescope', {
      fontFamily: 'Arial',
      fontSize: '38px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(25, 70, 'Drag to explore. Tap a world to learn its name.', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#d7e8ff',
      wordWrap: { width: 245 },
    });
    this.add.text(25, 140, 'Pictures, sizes, and distances are not to scale.', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aebfd1',
      wordWrap: { width: 235 },
    });
    this.add
      .text(137, 245, 'You selected:', {
        fontFamily: 'Arial',
        fontSize: '23px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.nameText = this.add
      .text(137, 300, 'Nothing yet', {
        fontFamily: 'Arial',
        fontSize: '34px',
        color: '#fff4c2',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 250 },
      })
      .setOrigin(0.5);
    this.messageText = this.add
      .text(137, 370, 'You can also center a world and press Go.', {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#d7e8ff',
        align: 'center',
        wordWrap: { width: 235 },
      })
      .setOrigin(0.5);
    addButton(this, 137, 485, 'Game Library', () => goToScene(this, 'GameHub'), 235);

    // Keep the pannable map behind the fixed information panel and controls.
    this.world = this.add.container(VIEW.x - this.panX, VIEW.y - this.panY).setDepth(-10);
    this.world.add(
      this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x050e1b),
    );
    for (let index = 0; index < 130; index += 1) {
      const x = 25 + ((index * 347) % 3850);
      const y = 25 + ((index * 193) % 1030);
      this.world.add(
        this.add.star(x, y, 4, 1.5, 3 + (index % 4), index % 4 === 0 ? 0xfff4c2 : 0xc7dcf0),
      );
    }
    for (const object of SOLAR_SYSTEM_OBJECTS) this.addSolarObject(object);
    this.selectionRing = this.add
      .ellipse(0, 0, 130, 130)
      .setStrokeStyle(7, 0xffd65a)
      .setFillStyle(0, 0)
      .setVisible(false);
    this.world.add(this.selectionRing);

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff).fillRect(VIEW.x, VIEW.y, VIEW.width, VIEW.height);
    this.world.setMask(maskShape.createGeometryMask());
    this.add
      .rectangle(VIEW.x + VIEW.width / 2, VIEW.y + VIEW.height / 2, VIEW.width, VIEW.height)
      .setStrokeStyle(12, 0x89aac3)
      .setFillStyle(0, 0);
    this.add
      .line(
        0,
        0,
        VIEW.x + VIEW.width / 2 - 22,
        VIEW.y + VIEW.height / 2,
        VIEW.x + VIEW.width / 2 + 22,
        VIEW.y + VIEW.height / 2,
        0xfff4c2,
      )
      .setLineWidth(3);
    this.add
      .line(
        0,
        0,
        VIEW.x + VIEW.width / 2,
        VIEW.y + VIEW.height / 2 - 22,
        VIEW.x + VIEW.width / 2,
        VIEW.y + VIEW.height / 2 + 22,
        0xfff4c2,
      )
      .setLineWidth(3);
    const zone = this.add.zone(
      VIEW.x + VIEW.width / 2,
      VIEW.y + VIEW.height / 2,
      VIEW.width,
      VIEW.height,
    );
    this.cleanupPan = enablePannableSearchView(this, zone, {
      onPan: (deltaX, deltaY) => this.panBy(-deltaX, -deltaY),
      onTap: (x, y) => this.selectAtScreen(x, y),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupPan?.();
      stopSpeaking();
    });
    this.updateWorldPosition();
  }

  update(_time: number, delta: number): void {
    const amount = (330 * Math.min(delta, 40)) / 1000;
    const x = Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft'));
    const y = Number(actions.isHeld('moveDown')) - Number(actions.isHeld('moveUp'));
    if (x || y) this.panBy(x * amount, y * amount);
    if (actions.wasPressed('primaryAction') || actions.wasPressed('confirm'))
      this.selectAtScreen(VIEW.x + VIEW.width / 2, VIEW.y + VIEW.height / 2);
    if (actions.wasPressed('cancel')) goToScene(this, 'GameHub');
  }

  private addSolarObject(object: SolarSystemObject): void {
    const body =
      object.id === 'haumea'
        ? this.add.ellipse(0, 0, object.radius * 2.7, object.radius * 1.35, object.color)
        : this.add.circle(0, 0, object.radius, object.color);
    body.setStrokeStyle(5, 0xffffff);
    const container = this.add.container(object.x, object.y, [body]);
    if (object.id === 'sun')
      container.add(
        this.add.star(0, 0, 18, object.radius - 12, object.radius + 18, 0xffd65a).setAlpha(0.35),
      );
    if (object.id === 'earth') container.add(this.add.ellipse(-10, -5, 28, 17, 0x6cc27a));
    if (object.id === 'jupiter') {
      container.add(this.add.rectangle(0, -22, 135, 12, 0xf0d1a5));
      container.add(this.add.rectangle(0, 20, 145, 10, 0xb87d61));
    }
    if (object.id === 'saturn')
      container.add(
        this.add.ellipse(0, 0, 210, 58).setStrokeStyle(12, 0xeedda7).setFillStyle(0, 0),
      );
    if (object.id === 'ceres') container.add(this.add.circle(8, -5, 7, 0xf2eadf));
    if (object.id === 'pluto') container.add(this.add.ellipse(5, 2, 24, 23, 0xf2ddd0));
    if (object.id === 'makemake') container.add(this.add.ellipse(-4, -5, 37, 11, 0xe2a083));
    if (object.id === 'eris') container.add(this.add.circle(-7, -7, 8, 0xc8d0d8));
    this.world.add(container);
  }

  private panBy(deltaX: number, deltaY: number): void {
    this.panX = Phaser.Math.Clamp(this.panX + deltaX, MIN_PAN_X, MAX_PAN_X);
    this.panY = Phaser.Math.Clamp(this.panY + deltaY, 0, WORLD.height - VIEW.height);
    this.updateWorldPosition();
  }
  private updateWorldPosition(): void {
    this.world.setPosition(VIEW.x - this.panX, VIEW.y - this.panY);
  }

  private selectAtScreen(screenX: number, screenY: number): void {
    const worldX = screenX - VIEW.x + this.panX;
    const worldY = screenY - VIEW.y + this.panY;
    const selected = SOLAR_SYSTEM_OBJECTS.find(
      (object) =>
        Phaser.Math.Distance.Between(worldX, worldY, object.x, object.y) <= object.selectionRadius,
    );
    if (!selected) {
      this.messageText.setText('That is a lovely patch of space. Keep exploring!');
      return;
    }
    this.nameText.setText(selected.name);
    this.messageText.setText(`This is ${selected.name}.`);
    this.selectionRing
      .setPosition(selected.x, selected.y)
      .setDisplaySize(selected.selectionRadius * 2.25, selected.selectionRadius * 2.25)
      .setVisible(true);
    speak(selected.name, preferences.current.muted);
  }
}
