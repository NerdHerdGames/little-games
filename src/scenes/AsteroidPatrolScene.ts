import Phaser from 'phaser';
import { playPlacementTone } from '../accessibility/FeedbackTone';
import { actions, preferences } from '../core/services';
import {
  asteroidTargetForWave,
  choosePatrolUpgrade,
  createAsteroidPatrolState,
  PATROL_UPGRADES,
  recordAsteroidCleared,
  TOTAL_PATROL_WAVES,
  type AsteroidPatrolState,
  type PatrolUpgrade,
} from '../games/asteroid-patrol/rules';
import { addButton } from '../ui/button';
import { MenuFocus } from '../ui/MenuFocus';

const ARENA = { left: 24, right: 1256, top: 105, bottom: 696 } as const;
const UPGRADE_LABELS: Record<PatrolUpgrade, { title: string; detail: string }> = {
  'rapid-beam': { title: 'Faster Beams', detail: 'Fire friendly beams more often.' },
  'wide-beam': { title: 'Wider Beams', detail: 'Make every beam easier to land.' },
  'helper-satellite': {
    title: 'Helper Satellite',
    detail: 'Send an extra beam toward space rocks.',
  },
};

interface PatrolAsteroid {
  display: Phaser.GameObjects.Container;
  radius: number;
  health: number;
  speed: number;
}

interface PatrolProjectile {
  display: Phaser.GameObjects.Arc;
  velocityX: number;
  velocityY: number;
}

export class AsteroidPatrolScene extends Phaser.Scene {
  private state: AsteroidPatrolState = createAsteroidPatrolState();
  private ship!: Phaser.GameObjects.Container;
  private shield!: Phaser.GameObjects.Ellipse;
  private satellite!: Phaser.GameObjects.Arc;
  private asteroids: PatrolAsteroid[] = [];
  private projectiles: PatrolProjectile[] = [];
  private progressText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private lastShotAt = 0;
  private shieldUntil = 0;
  private paused = false;
  private pausePanel: Phaser.GameObjects.Container | undefined;
  private pauseButtons: Phaser.GameObjects.Container[] = [];
  private pauseFocus = new MenuFocus(2);
  private upgradePanel: Phaser.GameObjects.Container | undefined;
  private upgradeButtons: Phaser.GameObjects.Container[] = [];
  private upgradeFocus = new MenuFocus(PATROL_UPGRADES.length);

  constructor() {
    super('AsteroidPatrol');
  }

  create(): void {
    this.state = createAsteroidPatrolState();
    this.asteroids = [];
    this.projectiles = [];
    this.paused = false;
    this.lastShotAt = 0;
    this.shieldUntil = 0;
    this.cameras.main.setBackgroundColor('#071322');
    this.createBackdrop();
    this.add.text(20, 16, 'Asteroid Patrol', {
      fontFamily: 'Arial',
      fontSize: '38px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    this.add.text(20, 59, 'Move the ship. Friendly beams fire automatically.', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#d7e8ff',
    });
    this.progressText = this.add
      .text(640, 28, '', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.statusText = this.add
      .text(640, 66, 'Clear the nearby space rocks!', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#bdefff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    addButton(this, 900, 48, 'Pause', () => this.showPause(), 160);
    addButton(this, 1145, 48, 'Game Library', () => this.returnToLibrary(), 220);
    this.createShip();
    this.spawnWave();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearMovingObjects());
  }

  update(time: number, delta: number): void {
    if (this.state.complete) return;
    if (this.paused) {
      this.updatePauseInput();
      return;
    }
    if (this.state.awaitingUpgrade) {
      this.updateUpgradeInput();
      return;
    }
    if (actions.wasPressed('pause')) {
      this.showPause();
      return;
    }

    const safeDelta = Math.min(delta, 40);
    this.updateShip(safeDelta);
    this.updateAsteroids(time, safeDelta);
    this.updateProjectiles(safeDelta);
    this.updateAutoFire(time);
    this.shield.setVisible(time < this.shieldUntil);
  }

  private createBackdrop(): void {
    this.add
      .rectangle(
        640,
        (ARENA.top + ARENA.bottom) / 2,
        ARENA.right - ARENA.left,
        ARENA.bottom - ARENA.top,
        0x091b31,
      )
      .setStrokeStyle(5, 0x4c82a8);
    for (let index = 0; index < 75; index += 1) {
      const x = ARENA.left + 12 + ((index * 197) % (ARENA.right - ARENA.left - 24));
      const y = ARENA.top + 12 + ((index * 113) % (ARENA.bottom - ARENA.top - 24));
      this.add.circle(
        x,
        y,
        index % 5 === 0 ? 2.5 : 1.5,
        index % 4 === 0 ? 0xfff4c2 : 0x8fc9ed,
        0.8,
      );
    }
  }

  private createShip(): void {
    const body = this.add.ellipse(0, 0, 62, 34, 0x63c7ef).setStrokeStyle(4, 0xffffff);
    const nose = this.add.triangle(39, 0, -12, -17, 17, 0, -12, 17, 0xffd65a);
    const upperWing = this.add.triangle(-8, -20, -16, 18, 12, 18, 2, -10, 0x557bdc);
    const lowerWing = this.add.triangle(-8, 20, -16, -18, 12, -18, 2, 10, 0x557bdc);
    const window = this.add.circle(10, -4, 8, 0x17324d).setStrokeStyle(2, 0xffffff);
    this.shield = this.add
      .ellipse(0, 0, 104, 82, 0x8cecff, 0.18)
      .setStrokeStyle(5, 0x8cecff)
      .setVisible(false);
    this.satellite = this.add
      .circle(-58, 0, 10, 0xffd65a)
      .setStrokeStyle(3, 0xffffff)
      .setVisible(false);
    this.ship = this.add
      .container(640, 410, [this.shield, this.satellite, upperWing, lowerWing, body, nose, window])
      .setDepth(10);
  }

  private updateShip(delta: number): void {
    const inputX = Number(actions.isHeld('moveRight')) - Number(actions.isHeld('moveLeft'));
    const inputY = Number(actions.isHeld('moveDown')) - Number(actions.isHeld('moveUp'));
    const length = Math.hypot(inputX, inputY);
    if (!length) return;
    const x = inputX / length;
    const y = inputY / length;
    const distance = (230 * delta) / 1000;
    this.ship.x = Phaser.Math.Clamp(this.ship.x + x * distance, ARENA.left + 55, ARENA.right - 55);
    this.ship.y = Phaser.Math.Clamp(this.ship.y + y * distance, ARENA.top + 48, ARENA.bottom - 48);
    if (!preferences.current.reducedMotion) this.ship.rotation = Math.atan2(y, x);
  }

  private spawnWave(): void {
    this.clearMovingObjects();
    const count = asteroidTargetForWave(this.state.wave);
    for (let index = 0; index < count; index += 1) {
      const sizeIndex = (index + this.state.wave) % 3;
      const radius = [19, 27, 36][sizeIndex] ?? 27;
      const health = sizeIndex + 1;
      const edge = index % 4;
      const x =
        edge === 0
          ? ARENA.left + 45
          : edge === 2
            ? ARENA.right - 45
            : Phaser.Math.Between(80, 1200);
      const y =
        edge === 1
          ? ARENA.top + 45
          : edge === 3
            ? ARENA.bottom - 45
            : Phaser.Math.Between(150, 650);
      const body = this.add.circle(0, 0, radius, 0x8795a4).setStrokeStyle(4, 0xd9e1e8);
      const craterOne = this.add.circle(-radius * 0.28, -radius * 0.2, radius * 0.18, 0x5f6b78);
      const craterTwo = this.add.circle(radius * 0.24, radius * 0.25, radius * 0.12, 0x687583);
      const display = this.add.container(x, y, [body, craterOne, craterTwo]).setDepth(4);
      this.asteroids.push({
        display,
        radius,
        health,
        speed: 18 + this.state.wave * 3 + sizeIndex * 2,
      });
    }
    this.refreshProgress();
    this.statusText.setText(`Wave ${this.state.wave}: gently clear the space rocks.`);
  }

  private updateAsteroids(time: number, delta: number): void {
    const motionScale = preferences.current.reducedMotion ? 0.6 : 1;
    for (const asteroid of this.asteroids) {
      const angle = Phaser.Math.Angle.Between(
        asteroid.display.x,
        asteroid.display.y,
        this.ship.x,
        this.ship.y,
      );
      asteroid.display.x += Math.cos(angle) * asteroid.speed * motionScale * (delta / 1000);
      asteroid.display.y += Math.sin(angle) * asteroid.speed * motionScale * (delta / 1000);
      if (!preferences.current.reducedMotion) asteroid.display.rotation += 0.00018 * delta;
      const distance = Phaser.Math.Distance.Between(
        asteroid.display.x,
        asteroid.display.y,
        this.ship.x,
        this.ship.y,
      );
      if (distance > asteroid.radius + 31 || time < this.shieldUntil) continue;
      this.shieldUntil = time + 1400;
      this.statusText.setText('Shield bounce! Keep exploring safely.');
      const pushAngle = Phaser.Math.Angle.Between(
        asteroid.display.x,
        asteroid.display.y,
        this.ship.x,
        this.ship.y,
      );
      this.ship.x = Phaser.Math.Clamp(
        this.ship.x + Math.cos(pushAngle) * 45,
        ARENA.left + 55,
        ARENA.right - 55,
      );
      this.ship.y = Phaser.Math.Clamp(
        this.ship.y + Math.sin(pushAngle) * 45,
        ARENA.top + 48,
        ARENA.bottom - 48,
      );
      asteroid.display.x -= Math.cos(pushAngle) * 48;
      asteroid.display.y -= Math.sin(pushAngle) * 48;
    }
  }

  private updateAutoFire(time: number): void {
    if (!this.asteroids.length) return;
    const cooldown = Math.max(300, 850 - this.state.upgrades['rapid-beam'] * 135);
    if (time - this.lastShotAt < cooldown) return;
    this.lastShotAt = time;
    const targets = [...this.asteroids].sort(
      (first, second) =>
        Phaser.Math.Distance.Squared(this.ship.x, this.ship.y, first.display.x, first.display.y) -
        Phaser.Math.Distance.Squared(this.ship.x, this.ship.y, second.display.x, second.display.y),
    );
    const firstTarget = targets[0];
    if (firstTarget) this.fireProjectile(this.ship.x, this.ship.y, firstTarget);
    if (this.state.upgrades['helper-satellite'] > 0) {
      const helperTarget = targets[1] ?? firstTarget;
      if (helperTarget) this.fireProjectile(this.ship.x - 30, this.ship.y, helperTarget);
    }
  }

  private fireProjectile(x: number, y: number, target: PatrolAsteroid): void {
    const angle = Phaser.Math.Angle.Between(x, y, target.display.x, target.display.y);
    const radius = 6 + this.state.upgrades['wide-beam'] * 3;
    const display = this.add.circle(x, y, radius, 0xfff4a8).setStrokeStyle(2, 0x58d9ff).setDepth(7);
    this.projectiles.push({
      display,
      velocityX: Math.cos(angle) * 470,
      velocityY: Math.sin(angle) * 470,
    });
  }

  private updateProjectiles(delta: number): void {
    for (
      let projectileIndex = this.projectiles.length - 1;
      projectileIndex >= 0;
      projectileIndex -= 1
    ) {
      const projectile = this.projectiles[projectileIndex];
      if (!projectile) continue;
      projectile.display.x += projectile.velocityX * (delta / 1000);
      projectile.display.y += projectile.velocityY * (delta / 1000);
      if (
        projectile.display.x < ARENA.left ||
        projectile.display.x > ARENA.right ||
        projectile.display.y < ARENA.top ||
        projectile.display.y > ARENA.bottom
      ) {
        this.removeProjectile(projectileIndex);
        continue;
      }
      for (let asteroidIndex = this.asteroids.length - 1; asteroidIndex >= 0; asteroidIndex -= 1) {
        const asteroid = this.asteroids[asteroidIndex];
        if (!asteroid) continue;
        const hitDistance = asteroid.radius + projectile.display.radius;
        if (
          Phaser.Math.Distance.Squared(
            projectile.display.x,
            projectile.display.y,
            asteroid.display.x,
            asteroid.display.y,
          ) >
          hitDistance * hitDistance
        )
          continue;
        this.removeProjectile(projectileIndex);
        asteroid.health -= 1;
        if (asteroid.health <= 0) this.clearAsteroid(asteroidIndex);
        break;
      }
    }
  }

  private clearAsteroid(index: number): void {
    const asteroid = this.asteroids[index];
    if (!asteroid) return;
    const { x, y } = asteroid.display;
    asteroid.display.destroy();
    this.asteroids.splice(index, 1);
    this.makeSpaceDust(x, y);
    const result = recordAsteroidCleared(this.state);
    this.state = result.state;
    this.refreshProgress();
    if (!result.waveCleared) return;
    playPlacementTone(preferences.current.muted);
    if (result.missionComplete) this.showCompletion();
    else this.showUpgradeChoices();
  }

  private makeSpaceDust(x: number, y: number): void {
    if (preferences.current.reducedMotion) return;
    for (let index = 0; index < 6; index += 1) {
      const dust = this.add
        .circle(x, y, 3 + (index % 2), index % 2 ? 0xffd65a : 0xbdefff)
        .setDepth(6);
      const angle = (Math.PI * 2 * index) / 6;
      this.tweens.add({
        targets: dust,
        x: x + Math.cos(angle) * 34,
        y: y + Math.sin(angle) * 34,
        alpha: 0,
        duration: 380,
        onComplete: () => dust.destroy(),
      });
    }
  }

  private showUpgradeChoices(): void {
    this.upgradeFocus = new MenuFocus(PATROL_UPGRADES.length);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x071322, 0.88).setInteractive();
    const panel = this.add.rectangle(640, 375, 720, 540, 0xf7fbff).setStrokeStyle(7, 0x58a6c7);
    const title = this.add
      .text(640, 145, `Wave ${this.state.wave} cleared!`, {
        fontFamily: 'Arial',
        fontSize: '38px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const prompt = this.add
      .text(640, 195, 'Choose one friendly ship upgrade.', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#365c70',
      })
      .setOrigin(0.5);
    this.upgradeButtons = PATROL_UPGRADES.map((upgrade, index) => {
      const copy = UPGRADE_LABELS[upgrade];
      return addButton(
        this,
        640,
        285 + index * 115,
        `${copy.title} — ${copy.detail}`,
        () => this.chooseUpgrade(upgrade),
        620,
      );
    });
    this.upgradePanel = this.add
      .container(0, 0, [shade, panel, title, prompt, ...this.upgradeButtons])
      .setDepth(100);
    this.refreshUpgradeFocus();
  }

  private updateUpgradeInput(): void {
    if (actions.wasPressed('moveDown') || actions.wasPressed('moveRight')) {
      this.upgradeFocus.next();
      this.refreshUpgradeFocus();
    }
    if (actions.wasPressed('moveUp') || actions.wasPressed('moveLeft')) {
      this.upgradeFocus.previous();
      this.refreshUpgradeFocus();
    }
    if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction')) {
      const upgrade = PATROL_UPGRADES[this.upgradeFocus.current];
      if (upgrade) this.chooseUpgrade(upgrade);
    }
  }

  private refreshUpgradeFocus(): void {
    this.upgradeButtons.forEach((button, index) =>
      button.setScale(index === this.upgradeFocus.current ? 1.04 : 1),
    );
  }

  private chooseUpgrade(upgrade: PatrolUpgrade): void {
    if (!this.state.awaitingUpgrade) return;
    this.state = choosePatrolUpgrade(this.state, upgrade);
    this.upgradePanel?.destroy();
    this.upgradePanel = undefined;
    this.upgradeButtons = [];
    this.satellite.setVisible(this.state.upgrades['helper-satellite'] > 0);
    this.spawnWave();
  }

  private showPause(): void {
    if (this.paused || this.state.complete || this.state.awaitingUpgrade) return;
    this.paused = true;
    this.pauseFocus = new MenuFocus(2);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x071322, 0.82).setInteractive();
    const panel = this.add.rectangle(640, 360, 620, 380, 0xf7fbff).setStrokeStyle(7, 0x58a6c7);
    const title = this.add
      .text(640, 245, 'Patrol paused', {
        fontFamily: 'Arial',
        fontSize: '42px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.pauseButtons = [
      addButton(this, 640, 350, 'Keep Patrolling', () => this.hidePause(), 420),
      addButton(this, 640, 455, 'Game Library', () => this.returnToLibrary(), 420),
    ];
    this.pausePanel = this.add
      .container(0, 0, [shade, panel, title, ...this.pauseButtons])
      .setDepth(120);
    this.refreshPauseFocus();
  }

  private updatePauseInput(): void {
    if (actions.wasPressed('moveDown') || actions.wasPressed('moveRight')) {
      this.pauseFocus.next();
      this.refreshPauseFocus();
    }
    if (actions.wasPressed('moveUp') || actions.wasPressed('moveLeft')) {
      this.pauseFocus.previous();
      this.refreshPauseFocus();
    }
    if (actions.wasPressed('cancel') || actions.wasPressed('pause')) this.hidePause();
    else if (actions.wasPressed('confirm') || actions.wasPressed('primaryAction')) {
      if (this.pauseFocus.current === 0) this.hidePause();
      else this.returnToLibrary();
    }
  }

  private refreshPauseFocus(): void {
    this.pauseButtons.forEach((button, index) =>
      button.setScale(index === this.pauseFocus.current ? 1.04 : 1),
    );
  }

  private hidePause(): void {
    this.paused = false;
    this.pausePanel?.destroy();
    this.pausePanel = undefined;
    this.pauseButtons = [];
  }

  private showCompletion(): void {
    this.clearMovingObjects();
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x071322, 0.82).setInteractive();
    const panel = this.add.rectangle(640, 365, 760, 440, 0xf7fbff).setStrokeStyle(8, 0x58a6c7);
    const title = this.add
      .text(640, 250, 'Space is sparkling clear!', {
        fontFamily: 'Arial',
        fontSize: '44px',
        color: '#17324d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const message = this.add
      .text(640, 320, 'Wonderful flying! Your shield kept every bump safe.', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#365c70',
        align: 'center',
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5);
    const replay = addButton(this, 500, 455, 'Patrol Again', () => this.scene.restart(), 250);
    const library = addButton(this, 790, 455, 'Game Library', () => this.returnToLibrary(), 250);
    this.add.container(0, 0, [shade, panel, title, message, replay, library]).setDepth(150);
    if (!preferences.current.reducedMotion)
      this.tweens.add({ targets: title, scale: 1.04, duration: 650, yoyo: true, repeat: 1 });
  }

  private refreshProgress(): void {
    this.progressText.setText(
      `Wave ${this.state.wave} of ${TOTAL_PATROL_WAVES} • Rocks cleared: ${this.state.clearedInWave} of ${asteroidTargetForWave(this.state.wave)}`,
    );
  }

  private removeProjectile(index: number): void {
    this.projectiles[index]?.display.destroy();
    this.projectiles.splice(index, 1);
  }

  private clearMovingObjects(): void {
    for (const asteroid of this.asteroids) asteroid.display.destroy();
    for (const projectile of this.projectiles) projectile.display.destroy();
    this.asteroids = [];
    this.projectiles = [];
  }

  private returnToLibrary(): void {
    this.scene.start('GameHub');
  }
}
