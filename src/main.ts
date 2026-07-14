import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { GAME_HEIGHT, GAME_WIDTH } from './config/settings';
import { actions, preferences } from './core/services';
import { InputCoordinator } from './input/InputCoordinator';
import { MenuScene } from './scenes/MenuScene';
import { StarCollectorScene } from './scenes/StarCollectorScene';
import './styles.css';

registerSW({
  immediate: true,
  onRegisterError: (error) => console.error('Offline setup failed:', error),
});

const coordinator = new InputCoordinator(actions);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#fff8e7',
  scene: [MenuScene, StarCollectorScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true, activePointers: 4 },
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: true },
});

game.events.on(Phaser.Core.Events.PRE_STEP, () => coordinator.update());
window.addEventListener('preferenceschange', () => game.sound.setMute(preferences.current.muted));
game.sound.setMute(preferences.current.muted);
