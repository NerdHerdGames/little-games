import Phaser from 'phaser';
import { goToScene } from '../../core/SceneTransitions';
import type { MarbleRun3DGame } from './MarbleRun3DGame';

/** Phaser owns routing and lifecycle; load the 3D workshop only on entry. */
export class MarbleRun3DScene extends Phaser.Scene {
  private game3d: MarbleRun3DGame | undefined;
  private generation = 0;
  constructor() {
    super('MarbleRun3D');
  }
  create(): void {
    const generation = ++this.generation;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.generation++;
      this.game3d?.dispose();
      this.game3d = undefined;
    });
    void import('./MarbleRun3DGame')
      .then(({ MarbleRun3DGame }) => {
        if (generation !== this.generation) return;
        this.game3d = new MarbleRun3DGame(() => goToScene(this, 'GameHub'));
      })
      .catch((error) => {
        console.error('Unable to load Marble Studio', error);
        if (generation === this.generation) goToScene(this, 'GameHub');
      });
  }
  update(_time: number, delta: number): void {
    this.game3d?.update(delta);
  }
}
