import { describe, expect, it } from 'vitest';
import {
  advanceExplorer,
  changeView,
  createExplorer,
  moonPosition,
  moveView,
  ORBIT_RADIUS,
  stepMoon,
  viewDistance,
} from './rules';

describe('Earth and Moon Explorer', () => {
  it('keeps every orbit point at the same distance from Earth', () => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const point = moonPosition(angle);
      expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(ORBIT_RADIUS, 10);
    }
    expect(moonPosition(0).x).toBeCloseTo(ORBIT_RADIUS);
    expect(moonPosition(Math.PI).x).toBeCloseTo(-ORBIT_RADIUS);
  });

  it('pauses all automatic movement for pause and reduced-motion preferences', () => {
    const state = createExplorer();
    expect(advanceExplorer(state, 10, true)).toBe(state);
    const paused = { ...state, playing: false };
    expect(advanceExplorer(paused, 10, false)).toBe(paused);
    expect(advanceExplorer(state, NaN, false)).toBe(state);
    expect(advanceExplorer(state, -1, false)).toBe(state);
  });

  it('advances spin and orbit by elapsed time rather than frame count', () => {
    let shortFrames = createExplorer();
    let longFrames = createExplorer();
    for (let count = 0; count < 300; count += 1)
      shortFrames = advanceExplorer(shortFrames, 1 / 60, false);
    for (let count = 0; count < 150; count += 1)
      longFrames = advanceExplorer(longFrames, 1 / 30, false);
    expect(shortFrames.earthSpin).toBeCloseTo(longFrames.earthSpin, 10);
    expect(shortFrames.moonPhase).toBeCloseTo(longFrames.moonPhase, 10);
    const wrapped = advanceExplorer(createExplorer(), 10000, false);
    expect(wrapped.moonPhase).toBeGreaterThanOrEqual(0);
    expect(wrapped.moonPhase).toBeLessThan(Math.PI * 2);
  });

  it('allows manual steps in a still view without resuming automatic motion', () => {
    const state = createExplorer();
    const next = stepMoon(state);
    expect(next.playing).toBe(false);
    expect(next.earthSpin).toBe(state.earthSpin);
    expect(next.moonPhase).toBeCloseTo(state.moonPhase + Math.PI / 8);
    expect(advanceExplorer(next, 10, true)).toBe(next);
  });

  it('limits zoom and camera tilt so repeated gestures cannot invert or enter a world', () => {
    let state = createExplorer();
    for (let count = 0; count < 100; count += 1)
      state = moveView(state, { rotateX: 10, rotateY: 10, zoom: 10 });
    expect(state.zoom).toBe(2.2);
    expect(state.pitch).toBe(1.15);
    expect(state.yaw).toBeGreaterThanOrEqual(0);
    expect(state.yaw).toBeLessThan(Math.PI * 2);
    for (let count = 0; count < 100; count += 1)
      state = moveView(state, { rotateX: -10, rotateY: -10, zoom: -10 });
    expect(state.zoom).toBe(0.65);
    expect(state.pitch).toBe(-1.15);
    expect(moveView(state, { rotateX: NaN, rotateY: 0, zoom: 0 })).toBe(state);
    expect(viewDistance({ ...state, target: 'earth', zoom: 2.2 })).toBeGreaterThan(1);
    expect(viewDistance({ ...state, target: 'moon', zoom: 2.2 })).toBeGreaterThan(0.2724);
  });

  it('resets camera framing when choosing a world while preserving motion and orbit settings', () => {
    const state = {
      ...createExplorer(),
      zoom: 2,
      yaw: 2,
      pitch: 1,
      playing: false,
      showOrbit: false,
    };
    const moon = changeView(state, 'moon');
    expect(moon).toMatchObject({
      target: 'moon',
      zoom: 1,
      yaw: 0,
      pitch: 0.28,
      playing: false,
      showOrbit: false,
    });
    expect(moon.moonPhase).toBe(state.moonPhase);
    expect(viewDistance(moon)).toBeLessThan(viewDistance(changeView(state, 'earth')));
    expect(viewDistance(changeView(state, 'earth'))).toBeLessThan(
      viewDistance(changeView(state, 'system')),
    );
  });
});
