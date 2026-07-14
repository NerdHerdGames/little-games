import type Phaser from 'phaser';
import { preferences } from './services';

export const goToScene = (scene: Phaser.Scene, key: string, data?: object): void => {
  if (preferences.current.reducedMotion) {
    scene.scene.start(key, data);
    return;
  }
  scene.cameras.main.fadeOut(180, 13, 27, 42);
  scene.time.delayedCall(180, () => {
    // Phaser keeps a stopped scene's camera state. Clear the completed fade so
    // revisiting this scene later cannot leave it rendering fully black.
    scene.cameras.main.resetFX();
    scene.scene.start(key, data);
  });
};
