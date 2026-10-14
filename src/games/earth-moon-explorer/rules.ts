import type { ViewGesture } from '../../input/ActionState';

export type ViewTarget = 'system' | 'earth' | 'moon';

export interface ExplorerState {
  target: ViewTarget;
  yaw: number;
  pitch: number;
  zoom: number;
  earthSpin: number;
  moonPhase: number;
  playing: boolean;
  showOrbit: boolean;
}

export const MOON_RADIUS = 0.2724;
export const ORBIT_RADIUS = 3.7;
const TAU = Math.PI * 2;
const wrap = (value: number): number => ((value % TAU) + TAU) % TAU;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const createExplorer = (): ExplorerState => ({
  target: 'system',
  yaw: 0,
  pitch: 0.28,
  zoom: 1,
  earthSpin: 2.4,
  moonPhase: 0.35,
  playing: true,
  showOrbit: true,
});

export const changeView = (state: ExplorerState, target: ViewTarget): ExplorerState => ({
  ...state,
  target,
  yaw: 0,
  pitch: 0.28,
  zoom: 1,
});

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
    earthSpin: wrap(state.earthSpin + seconds * 0.07),
    moonPhase: wrap(state.moonPhase + seconds * 0.18),
  };
};

export const stepMoon = (state: ExplorerState): ExplorerState => ({
  ...state,
  playing: false,
  moonPhase: wrap(state.moonPhase + Math.PI / 8),
});

export const moonPosition = (phase: number) => ({
  x: Math.cos(phase) * ORBIT_RADIUS,
  y: Math.sin(phase) * ORBIT_RADIUS * Math.sin((5.1 * Math.PI) / 180),
  z: Math.sin(phase) * ORBIT_RADIUS * Math.cos((5.1 * Math.PI) / 180),
});

export const viewDistance = (state: ExplorerState): number =>
  ({ system: 11.5, earth: 3.9, moon: 1.1 })[state.target] / state.zoom;

// Short descriptions paraphrased from NASA's Earth and Moon fact pages (see asset credits).
export const WORLD_FACTS = {
  system: {
    title: 'Our home and its Moon',
    detail: 'Earth spins. The Moon travels around it. Take a closer look at either world!',
    fact: 'The Moon keeps the same side facing Earth as it travels around our planet.',
  },
  earth: {
    title: 'Hello, Earth!',
    detail: 'Blue oceans, green land, and icy poles. This is our home in space.',
    fact: 'One spin of Earth takes about one day. Sunlight lights the daytime side.',
  },
  moon: {
    title: 'Meet the Moon',
    detail: 'Look for dark plains and round craters on this rocky world.',
    fact: 'The Moon shines by reflecting sunlight. It takes about a month to go around Earth.',
  },
} as const;
