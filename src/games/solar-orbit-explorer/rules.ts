import type { ViewGesture } from '../../input/ActionState';

// Display sizes and spacing are deliberately compressed; speeds preserve faster inner orbits.
export const PLANETS = [
  {
    id: 'mercury',
    name: 'Mercury',
    radius: 0.18,
    orbit: 2.1,
    speed: 4,
    phase: 0.4,
    color: 0xa9a39b,
    detail: 'A small, rocky world close to the Sun.',
    fact: 'Mercury is the smallest planet and travels around the Sun fastest.',
  },
  {
    id: 'venus',
    name: 'Venus',
    radius: 0.3,
    orbit: 3.1,
    speed: 3,
    phase: 2.5,
    color: 0xe7b866,
    detail: 'Thick clouds wrap this bright planet.',
    fact: 'Venus is the hottest planet. Its thick atmosphere traps heat.',
  },
  {
    id: 'earth',
    name: 'Earth',
    radius: 0.32,
    orbit: 4.1,
    speed: 2.2,
    phase: 4.4,
    color: 0x4f9dde,
    detail: 'Blue oceans, land, and icy poles. Our home in space!',
    fact: 'Earth takes about one year to travel around the Sun.',
  },
  {
    id: 'mars',
    name: 'Mars',
    radius: 0.24,
    orbit: 5.1,
    speed: 1.75,
    phase: 1.5,
    color: 0xc5684e,
    detail: 'Meet our rusty red, rocky neighbor.',
    fact: 'Mars has two small moons named Phobos and Deimos.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    radius: 0.7,
    orbit: 7,
    speed: 1,
    phase: 3.5,
    color: 0xd2a679,
    detail: 'Look for stripes and a big swirling storm.',
    fact: 'Jupiter is the largest planet. Its Great Red Spot is a giant storm.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    radius: 0.57,
    orbit: 9.2,
    speed: 0.8,
    phase: 5.4,
    color: 0xe3c983,
    detail: 'A gas giant surrounded by beautiful rings.',
    fact: 'Saturn’s rings are made of many pieces of ice and rock.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    radius: 0.43,
    orbit: 11.2,
    speed: 0.6,
    phase: 0.9,
    color: 0x91d7dc,
    detail: 'A pale blue ice giant far from the Sun.',
    fact: 'Uranus spins on its side, like a rolling ball.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    radius: 0.42,
    orbit: 13,
    speed: 0.45,
    phase: 4.1,
    color: 0x557bdc,
    detail: 'A deep blue world at the edge of the planet family.',
    fact: 'Neptune is the farthest planet from the Sun. A year there lasts about 165 Earth years.',
  },
] as const;

export type Planet = (typeof PLANETS)[number];
export type ViewTarget = 'system' | 'sun' | Planet['id'];
export const VIEW_TARGETS: readonly ViewTarget[] = ['system', 'sun', ...PLANETS.map((p) => p.id)];
export const isViewTarget = (value: string): value is ViewTarget =>
  VIEW_TARGETS.some((target) => target === value);
export const SUN_RADIUS = 0.95;
export interface ExplorerState {
  target: ViewTarget;
  yaw: number;
  pitch: number;
  zoom: number;
  spin: number;
  phases: readonly number[];
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
  pitch: 0.65,
  zoom: 1,
  spin: 0,
  phases: PLANETS.map((p) => p.phase),
  playing: true,
  showOrbit: true,
});
export const changeView = (state: ExplorerState, target: ViewTarget): ExplorerState => ({
  ...state,
  target,
  yaw: 0,
  pitch: target === 'system' ? 0.65 : 0.28,
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
    spin: wrap(state.spin + seconds * 0.09),
    phases: PLANETS.map((planet, index) =>
      wrap((state.phases[index] ?? planet.phase) + seconds * 0.06 * planet.speed),
    ),
  };
};
export const stepPlanets = (state: ExplorerState): ExplorerState => ({
  ...advanceExplorer({ ...state, playing: true }, 2, false),
  playing: false,
});
export const planetPosition = (planet: Planet, phase: number) => ({
  x: Math.cos(phase) * planet.orbit,
  y: 0,
  z: Math.sin(phase) * planet.orbit,
});
export const viewDistance = (state: ExplorerState): number => {
  const planet = PLANETS.find((p) => p.id === state.target);
  const radius = planet ? planet.radius * (planet.id === 'saturn' ? 1.9 : 1) : SUN_RADIUS;
  return (state.target === 'system' ? 48 : radius * 4.5) / state.zoom;
};
export const worldFacts = (target: ViewTarget) => {
  const planet = PLANETS.find((p) => p.id === target);
  if (planet) return { title: `Hello, ${planet.name}!`, detail: planet.detail, fact: planet.fact };
  return target === 'sun'
    ? {
        title: 'Meet our star',
        detail: 'The Sun shines at the center of our solar system.',
        fact: 'The Sun is a star. Its light and warmth help life on Earth.',
      }
    : {
        title: 'One Sun, eight planets',
        detail: 'Watch the planets travel around the Sun. Choose any world for a closer look!',
        fact: 'The inner planets travel around the Sun faster than the outer planets.',
      };
};
