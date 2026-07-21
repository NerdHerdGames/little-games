import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { GAME_HEIGHT, GAME_WIDTH } from './config/settings';
import { getTouchControlProfile } from './config/touchControls';
import { actions, preferences } from './core/services';
import { InputCoordinator } from './input/InputCoordinator';
import { BadgeCollectionScene } from './scenes/BadgeCollectionScene';
import { AllWorldsCelebrationScene } from './scenes/AllWorldsCelebrationScene';
import { BootScene } from './scenes/BootScene';
import { CeresMissionScene } from './scenes/CeresMissionScene';
import { DwarfFactMatchScene } from './scenes/DwarfFactMatchScene';
import { FactCardScene } from './scenes/FactCardScene';
import { FishTankQuizScene } from './scenes/FishTankQuizScene';
import { FishShapeMatchScene } from './scenes/FishShapeMatchScene';
import { ErisMissionScene } from './scenes/ErisMissionScene';
import { FreeExploreScene } from './scenes/FreeExploreScene';
import { GameHubScene } from './scenes/GameHubScene';
import { HaumeaMissionScene } from './scenes/HaumeaMissionScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { MakemakeMissionScene } from './scenes/MakemakeMissionScene';
import { PlanetSelectScene } from './scenes/PlanetSelectScene';
import { PlanetFactMatchScene } from './scenes/PlanetFactMatchScene';
import { ParentInfoScene } from './scenes/ParentInfoScene';
import { PlutoMissionScene } from './scenes/PlutoMissionScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShapeFlipMatchScene } from './scenes/ShapeFlipMatchScene';
import { SolarSystemExplorerScene } from './scenes/SolarSystemExplorerScene';
import { SolarSystemOrderScene } from './scenes/SolarSystemOrderScene';
import { StarCollectorScene } from './scenes/StarCollectorScene';
import { TractorTrailerScene } from './scenes/TractorTrailerScene';
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
    GameHubScene,
    StarCollectorScene,
    SolarSystemExplorerScene,
    FishTankQuizScene,
    FishShapeMatchScene,
    ShapeFlipMatchScene,
    TractorTrailerScene,
    PlanetFactMatchScene,
    DwarfFactMatchScene,
    SolarSystemOrderScene,
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

let activeTouchScene = '';
game.events.on(Phaser.Core.Events.PRE_STEP, () => {
  const activeScenes = game.scene.getScenes(true);
  const sceneKey = activeScenes.at(-1)?.sys.settings.key ?? '';
  if (sceneKey !== activeTouchScene) {
    activeTouchScene = sceneKey;
    coordinator.setTouchProfile(getTouchControlProfile(sceneKey));
  }
  coordinator.update();
});
window.addEventListener('preferenceschange', () => game.sound.setMute(preferences.current.muted));
game.sound.setMute(preferences.current.muted);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.loop.sleep();
  else game.loop.wake();
});
