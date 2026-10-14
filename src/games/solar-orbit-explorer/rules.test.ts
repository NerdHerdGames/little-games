import { describe, expect, it } from 'vitest';
import {
  advanceExplorer,
  changeView,
  createExplorer,
  isViewTarget,
  moveView,
  PLANETS,
  planetPosition,
  stepPlanets,
  SUN_RADIUS,
  viewDistance,
  VIEW_TARGETS,
  worldFacts,
} from './rules';

describe('Sun and Planet Explorer', () => {
  it('contains the eight planets in increasing distance order with faster inner orbits', () => {
    expect(PLANETS.map((planet) => planet.id)).toEqual([
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ]);
    for (let index = 1; index < PLANETS.length; index += 1) {
      expect(PLANETS[index]!.orbit).toBeGreaterThan(PLANETS[index - 1]!.orbit);
      expect(PLANETS[index]!.speed).toBeLessThan(PLANETS[index - 1]!.speed);
    }
    for (const planet of PLANETS) {
      for (let phase = 0; phase < Math.PI * 2; phase += 0.1) {
        const point = planetPosition(planet, phase);
        expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(planet.orbit, 10);
      }
    }
  });
  it('advances by elapsed time and keeps orbit angles bounded', () => {
    let smallFrames = createExplorer();
    for (let frame = 0; frame < 300; frame += 1)
      smallFrames = advanceExplorer(smallFrames, 1 / 60, false);
    const oneFrame = advanceExplorer(createExplorer(), 5, false);
    oneFrame.phases.forEach((phase, index) =>
      expect(smallFrames.phases[index]).toBeCloseTo(phase, 10),
    );
    expect(smallFrames.spin).toBeCloseTo(oneFrame.spin, 10);
    const longTime = advanceExplorer(createExplorer(), 10000, false);
    for (const phase of longTime.phases) {
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(Math.PI * 2);
    }
  });
  it('respects pause and still view, but allows deliberate manual steps', () => {
    const state = createExplorer();
    expect(advanceExplorer(state, 10, true)).toBe(state);
    const paused = { ...state, playing: false };
    expect(advanceExplorer(paused, 10, false)).toBe(paused);
    for (const time of [NaN, Infinity, -1, 0])
      expect(advanceExplorer(state, time, false)).toBe(state);
    const stepped = stepPlanets(paused);
    expect(stepped.playing).toBe(false);
    stepped.phases.forEach((phase, index) => expect(phase).not.toBe(state.phases[index]));
    expect(advanceExplorer(stepped, 10, true)).toBe(stepped);
  });
  it('provides facts and safe camera framing for every target without resetting orbits', () => {
    const state = { ...createExplorer(), yaw: 2, zoom: 2, playing: false, showOrbit: false };
    for (const target of VIEW_TARGETS) {
      expect(isViewTarget(target)).toBe(true);
      expect(worldFacts(target).fact.length).toBeGreaterThan(15);
      const changed = changeView(state, target);
      expect(changed).toMatchObject({ target, yaw: 0, zoom: 1, playing: false, showOrbit: false });
      expect(changed.phases).toBe(state.phases);
      const radius = PLANETS.find((p) => p.id === target)?.radius ?? SUN_RADIUS;
      expect(viewDistance({ ...changed, zoom: 2.2 })).toBeGreaterThan(radius);
    }
    expect(isViewTarget('moon')).toBe(false);
    expect(isViewTarget('constructor')).toBe(false);
  });
  it('clamps touch gestures and rejects non-finite input', () => {
    const state = createExplorer();
    const near = moveView(state, { rotateX: 100, rotateY: 100, zoom: 100 });
    expect(near.zoom).toBe(2.2);
    expect(near.pitch).toBe(1.15);
    expect(near.yaw).toBeGreaterThanOrEqual(0);
    expect(near.yaw).toBeLessThan(Math.PI * 2);
    let far = state;
    for (let count = 0; count < 10; count += 1)
      far = moveView(far, { rotateX: -100, rotateY: -100, zoom: -100 });
    expect(far.zoom).toBe(0.65);
    expect(far.pitch).toBe(-1.15);
    expect(moveView(state, { rotateX: NaN, rotateY: 0, zoom: 0 })).toBe(state);
  });
});
