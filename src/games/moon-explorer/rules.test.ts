import { describe, expect, it } from 'vitest';
import { PLANETS } from '../../data/planets';
import { SOLAR_SYSTEM_OBJECTS } from '../../data/solarSystem';
import {
  advanceExplorer,
  changeView,
  createExplorer,
  displayMoonRadius,
  displayOrbit,
  moonPosition,
  moveView,
  selectedMoon,
  stepMoons,
  viewDistance,
} from './rules';
import { CATALOGUE_DATE, getSystem, MOON_SYSTEMS, moonPage, MOONS_PER_PAGE } from './systems';

describe('Moon Explorer catalogue', () => {
  it('offers exactly the six planets and four recognized dwarf planets with moons using shared art', () => {
    expect(MOON_SYSTEMS.map(({ id }) => id)).toEqual([
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
      'haumea',
      'makemake',
      'eris',
    ]);
    for (const system of MOON_SYSTEMS) {
      expect(system.spritePath).toBe(
        SOLAR_SYSTEM_OBJECTS.find(({ id }) => id === system.id)?.spritePath,
      );
      expect(system.dwarf).toBe(PLANETS.some(({ id }) => id === system.id));
      expect(system.moons.length).toBeGreaterThan(0);
      expect(new Set(system.moons.map(({ id }) => id)).size).toBe(system.moons.length);
    }
  });

  it('preserves every moon from the dated JPL snapshot, including unnamed discoveries', () => {
    expect(CATALOGUE_DATE).toBe('2026-10-14');
    const counts = {
      earth: 1,
      mars: 2,
      jupiter: 115,
      saturn: 293,
      uranus: 29,
      neptune: 16,
      pluto: 5,
      haumea: 2,
      makemake: 1,
      eris: 1,
    };
    for (const system of MOON_SYSTEMS) expect(system.moons).toHaveLength(counts[system.id]);
    expect(MOON_SYSTEMS.reduce((count, system) => count + system.moons.length, 0)).toBe(465);
    expect(getSystem('jupiter').moons.some(({ name }) => name.startsWith('S/'))).toBe(true);
    expect(getSystem('saturn').moons.some(({ name }) => name.startsWith('S/'))).toBe(true);
    expect(getSystem('pluto').moons.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['Charon', 'Styx', 'Nix', 'Kerberos', 'Hydra']),
    );
    expect(getSystem('haumea').moons.map(({ name }) => name)).toEqual(["Hi'iaka", 'Namaka']);
  });

  it('makes all 465 moons reachable through pages and individual close-up targets', () => {
    for (const system of MOON_SYSTEMS) {
      const pages = Math.ceil(system.moons.length / MOONS_PER_PAGE);
      const visited = Array.from({ length: pages }, (_, page) => moonPage(system, page)).flat();
      expect(visited.map(({ id }) => id)).toEqual(system.moons.map(({ id }) => id));
      for (const moon of visited) {
        const state = changeView(createExplorer(), `moon:${moon.id}`, system);
        expect(selectedMoon(system, state)).toBe(moon);
        expect(viewDistance(system, { ...state, zoom: 2.2 })).toBeGreaterThan(
          displayMoonRadius(system, moon),
        );
      }
    }
  });
});

describe('Moon Explorer rules', () => {
  it('assigns every moon a finite, separated orbit inside the overview framing', () => {
    for (const system of MOON_SYSTEMS) {
      let previous = 0;
      system.moons.forEach((_moon, index) => {
        const orbit = displayOrbit(system, index);
        expect(orbit.radius).toBeGreaterThan(previous);
        previous = orbit.radius;
        for (const time of [0, 1, 10000]) {
          const point = moonPosition(orbit, time);
          expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(orbit.radius, 8);
        }
      });
      expect(viewDistance(system, createExplorer())).toBeGreaterThan(previous * 3);
    }
  });

  it('honors pause, reduced motion, and manual steps for every system', () => {
    const state = createExplorer();
    expect(advanceExplorer(state, 10, true)).toBe(state);
    const paused = { ...state, playing: false };
    expect(advanceExplorer(paused, 10, false)).toBe(paused);
    expect(advanceExplorer(state, NaN, false)).toBe(state);
    const next = stepMoons(state);
    expect(next.playing).toBe(false);
    expect(next.orbitTime).toBeGreaterThan(state.orbitTime);
    for (const system of MOON_SYSTEMS) {
      for (let index = 0; index < system.moons.length; index += 1) {
        const orbit = displayOrbit(system, index);
        expect(moonPosition(orbit, next.orbitTime)).not.toEqual(
          moonPosition(orbit, state.orbitTime),
        );
      }
    }
  });

  it('moves by elapsed time and limits the camera to useful zoom and tilt', () => {
    let short = createExplorer(),
      long = createExplorer();
    for (let count = 0; count < 300; count += 1) short = advanceExplorer(short, 1 / 60, false);
    for (let count = 0; count < 150; count += 1) long = advanceExplorer(long, 1 / 30, false);
    expect(short.orbitTime).toBeCloseTo(long.orbitTime, 10);
    expect(short.spin).toBeCloseTo(long.spin, 10);
    const moved = moveView(short, { rotateX: 10000, rotateY: 100, zoom: 100 });
    expect(moved).toMatchObject({ zoom: 2.2, pitch: 1.15 });
    expect(moved.yaw).toBeLessThan(Math.PI * 2);
    expect(moveView(moved, { rotateX: NaN, rotateY: 0, zoom: 0 })).toBe(moved);
    expect(moveView(moved, { rotateX: 0, rotateY: -100, zoom: -100 })).toMatchObject({
      zoom: 0.65,
      pitch: -1.15,
    });
  });

  it('does not carry a moon selection from one world into another', () => {
    const state = createExplorer();
    expect(changeView(state, 'moon:charon', getSystem('earth'))).toBe(state);
    const earth = changeView(state, 'planet', getSystem('earth'));
    expect(earth).toMatchObject({ target: 'planet', zoom: 1, yaw: 0 });
    expect(selectedMoon(getSystem('pluto'), earth)).toBeUndefined();
  });
});
