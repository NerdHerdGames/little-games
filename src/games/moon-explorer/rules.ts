import type { ViewGesture } from '../../input/ActionState';
import { getMoon, type MoonData, type MoonSystem } from './systems';

export type ViewTarget = 'system' | 'planet' | `moon:${string}`;
export interface ExplorerState {
  target: ViewTarget;
  yaw: number;
  pitch: number;
  zoom: number;
  spin: number;
  orbitTime: number;
  playing: boolean;
  showOrbit: boolean;
}
const TAU = Math.PI * 2;
const wrap = (value: number): number => ((value % TAU) + TAU) % TAU;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const createExplorer = (): ExplorerState => ({
  target: 'system',
  yaw: 0,
  pitch: 0.36,
  zoom: 1,
  spin: 2.4,
  orbitTime: 0,
  playing: true,
  showOrbit: true,
});

export const selectedMoon = (system: MoonSystem, state: ExplorerState): MoonData | undefined =>
  state.target.startsWith('moon:') ? getMoon(system, state.target.slice(5)) : undefined;

export const changeView = (
  state: ExplorerState,
  target: ViewTarget,
  system: MoonSystem,
): ExplorerState => {
  if (target.startsWith('moon:') && !getMoon(system, target.slice(5))) return state;
  return { ...state, target, yaw: 0, pitch: 0.36, zoom: 1 };
};

export const moveView = (state: ExplorerState, gesture: ViewGesture): ExplorerState => {
  if (![gesture.rotateX, gesture.rotateY, gesture.zoom].every(Number.isFinite)) return state;
  return {
    ...state,
    yaw: wrap(state.yaw + gesture.rotateX),
    pitch: clamp(state.pitch + gesture.rotateY, -1.15, 1.15),
    zoom: clamp(state.zoom * Math.exp(clamp(gesture.zoom, -2, 2)), 0.65, 2.2),
  };
};

export const advanceExplorer = (
  state: ExplorerState,
  seconds: number,
  reducedMotion: boolean,
): ExplorerState => {
  if (!state.playing || reducedMotion || !Number.isFinite(seconds) || seconds <= 0) return state;
  return {
    ...state,
    spin: wrap(state.spin + seconds * 0.07),
    orbitTime: state.orbitTime + seconds,
  };
};

export const stepMoons = (state: ExplorerState): ExplorerState => ({
  ...state,
  playing: false,
  orbitTime: state.orbitTime + 2,
});

/** Readable display orbits, not ephemerides: all moons have a stable slot and distinct phase. */
export const displayOrbit = (system: MoonSystem, index: number) => {
  const count = system.moons.length;
  const radius = count <= 5 ? 3 + index * 0.65 : 2.7 + (index / (count - 1)) * 4.3;
  const inclination = count <= 5 ? 0.09 + index * 0.035 : Math.sin(index * 1.7) * 0.36;
  return {
    radius,
    inclination,
    phase: 0.35 + index * 2.399963,
    speed: 0.75 / Math.pow(radius, 0.8),
  };
};

export const moonPosition = (orbit: ReturnType<typeof displayOrbit>, time: number) => {
  const phase = orbit.phase + time * orbit.speed;
  return {
    x: Math.cos(phase) * orbit.radius,
    y: Math.sin(phase) * orbit.radius * Math.sin(orbit.inclination),
    z: Math.sin(phase) * orbit.radius * Math.cos(orbit.inclination),
  };
};

export const displayMoonRadius = (system: MoonSystem, moon: MoonData): number =>
  moon.radiusKm === null
    ? 0.055
    : Math.max(0.055, Math.min(0.52, Math.sqrt(moon.radiusKm / system.radiusKm) * 0.65));

export const viewDistance = (system: MoonSystem, state: ExplorerState): number => {
  const moon = selectedMoon(system, state);
  const base =
    state.target === 'system'
      ? (displayOrbit(system, system.moons.length - 1).radius + 0.8) * 3.8
      : moon
        ? displayMoonRadius(system, moon) * 4.1
        : 4.1;
  return base / state.zoom;
};
