import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { GAME_HEIGHT, GAME_WIDTH } from './config/settings';
import { actions, preferences } from './core/services';
import { InputCoordinator } from './input/InputCoordinator';
import { BadgeCollectionScene } from './scenes/BadgeCollectionScene';
import { AllWorldsCelebrationScene } from './scenes/AllWorldsCelebrationScene';
import { BootScene } from './scenes/BootScene';
import { CeresMissionScene } from './scenes/CeresMissionScene';
import { FactCardScene } from './scenes/FactCardScene';
import { ErisMissionScene } from './scenes/ErisMissionScene';
import { FreeExploreScene } from './scenes/FreeExploreScene';
import { HaumeaMissionScene } from './scenes/HaumeaMissionScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { MakemakeMissionScene } from './scenes/MakemakeMissionScene';
import { PlanetSelectScene } from './scenes/PlanetSelectScene';
import { ParentInfoScene } from './scenes/ParentInfoScene';
import { PlutoMissionScene } from './scenes/PlutoMissionScene';
import { SettingsScene } from './scenes/SettingsScene';
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
  scene: [
    BootScene,
    MainMenuScene,
    PlanetSelectScene,
    CeresMissionScene,
    PlutoMissionScene,
    HaumeaMissionScene,
    MakemakeMissionScene,
    ErisMissionScene,
    FactCardScene,
    BadgeCollectionScene,
    AllWorldsCelebrationScene,
    FreeExploreScene,
    SettingsScene,
    ParentInfoScene,
  ],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true, activePointers: 4 },
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: true },
});

game.events.on(Phaser.Core.Events.PRE_STEP, () => coordinator.update());
window.addEventListener('preferenceschange', () => game.sound.setMute(preferences.current.muted));
game.sound.setMute(preferences.current.muted);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.loop.sleep();
  else game.loop.wake();
});
