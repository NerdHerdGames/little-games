import { describe, expect, it } from 'vitest';
import {
  COURSES,
  createPlatformer,
  PHYSICS_STEP,
  platformerCameraX,
  stepPlatformer,
  type PlatformerMode,
} from './rules';

describe('platformer movement and jumping', () => {
  it('waits for movement in the manual game and supports both directions', () => {
    const state = createPlatformer('manual');
    for (let frame = 0; frame < 120; frame += 1)
      stepPlatformer(state, 'manual', { direction: 0, jumpPressed: false });
    expect(state.x).toBe(100);
    expect(state.grounded).toBe(true);
    stepPlatformer(state, 'manual', { direction: 1, jumpPressed: false });
    expect(state.x).toBeGreaterThan(100);
    stepPlatformer(state, 'manual', { direction: -1, jumpPressed: false });
    expect(state.x).toBe(100);
    for (let frame = 0; frame < 120; frame += 1)
      stepPlatformer(state, 'manual', { direction: -1, jumpPressed: false });
    expect(state.x).toBe(22);
  });

  it('runs automatically, ignoring directional input', () => {
    const state = createPlatformer('runner');
    stepPlatformer(state, 'runner', { direction: -1, jumpPressed: false });
    expect(state.x).toBe(100 + 240 * PHYSICS_STEP);
  });

  it('jumps once per press and cannot jump again in midair', () => {
    const state = createPlatformer('manual');
    stepPlatformer(state, 'manual', { direction: 0, jumpPressed: true });
    expect(state.velocityY).toBeLessThan(0);
    expect(state.grounded).toBe(false);
    const velocity = state.velocityY;
    stepPlatformer(state, 'manual', { direction: 0, jumpPressed: true });
    expect(state.velocityY).toBeGreaterThan(velocity);
    for (let frame = 0; frame < 120; frame += 1)
      stepPlatformer(state, 'manual', { direction: 0, jumpPressed: false });
    expect(state.y).toBe(540);
    expect(state.grounded).toBe(true);
  });

  it('allows a late jump just after stepping off an edge', () => {
    const state = createPlatformer('manual');
    state.x = 544;
    stepPlatformer(state, 'manual', { direction: 1, jumpPressed: false });
    expect(state.grounded).toBe(false);
    stepPlatformer(state, 'manual', { direction: 1, jumpPressed: true });
    expect(state.velocityY).toBeLessThan(0);
  });

  it('buffers a jump tapped just before landing', () => {
    const state = createPlatformer('manual');
    state.y = 538;
    state.grounded = false;
    state.velocityY = 300;
    state.coyoteTime = 0;
    stepPlatformer(state, 'manual', { direction: 0, jumpPressed: true });
    expect(state.grounded).toBe(true);
    stepPlatformer(state, 'manual', { direction: 0, jumpPressed: false });
    expect(state.velocityY).toBeLessThan(0);
  });

  it('passes upward through a platform and lands on it when falling', () => {
    const state = createPlatformer('manual');
    state.x = 700;
    state.y = 482;
    state.velocityY = -300;
    state.grounded = false;
    state.coyoteTime = 0;
    stepPlatformer(state, 'manual', { direction: 0, jumpPressed: false });
    expect(state.y).toBeLessThan(480);
    expect(state.grounded).toBe(false);
    for (let frame = 0; frame < 120; frame += 1)
      stepPlatformer(state, 'manual', { direction: 0, jumpPressed: false });
    expect(state.y).toBe(480);
    expect(state.checkpoint).toBe(1);
  });
});

describe('platformer courses and gentle retries', () => {
  it.each(['manual', 'runner'] as const)(
    'can complete the entire %s course with timed jumps',
    (mode) => {
      const state = createPlatformer(mode);
      const course = COURSES[mode];
      for (let frame = 0; frame < 6000 && !state.complete; frame += 1) {
        const platform = course.platforms.find(
          (item) => state.x >= item.x && state.x <= item.x + item.width,
        );
        stepPlatformer(state, mode, {
          direction: 1,
          jumpPressed: Boolean(
            state.grounded &&
              platform &&
              platform !== course.platforms.at(-1) &&
              state.x >= platform.x + platform.width - 40,
          ),
        });
      }
      expect(state.complete).toBe(true);
      expect(state.rescues).toBe(0);
      expect(state.checkpoint).toBe(course.platforms.length - 1);
    },
  );

  it.each(['manual', 'runner'] as const)(
    'returns a missed %s jump to its last checkpoint, keeping stars',
    (mode) => {
      const state = createPlatformer(mode);
      state.checkpoint = 2;
      state.collected[0] = true;
      state.x = COURSES[mode].platforms[2]!.x + COURSES[mode].platforms[2]!.width + 50;
      state.y = 770;
      state.grounded = false;
      expect(stepPlatformer(state, mode, { direction: 0, jumpPressed: false })).toBe('rescue');
      expect(state.x).toBe(COURSES[mode].platforms[2]!.x + 90);
      expect(state.y).toBe(COURSES[mode].platforms[2]!.top);
      expect(state.collected[0]).toBe(true);
      expect(state.rescues).toBe(1);
      expect(state.velocityY).toBe(0);
    },
  );

  it('finishes without requiring optional stars and stops moving afterward', () => {
    const state = createPlatformer('runner');
    state.x = COURSES.runner.finishX;
    state.y = COURSES.runner.platforms.at(-1)!.top;
    expect(stepPlatformer(state, 'runner', { direction: 0, jumpPressed: false })).toBe('complete');
    expect(state.collected.some(Boolean)).toBe(false);
    const finished = structuredClone(state);
    stepPlatformer(state, 'runner', { direction: 1, jumpPressed: true });
    expect(state).toEqual(finished);
  });

  it.each(['manual', 'runner'] as PlatformerMode[])(
    'keeps the camera in bounds and still view fixed inside a room in %s',
    (mode) => {
      expect(platformerCameraX(100, mode, false)).toBe(0);
      expect(platformerCameraX(500, mode, false)).toBe(200);
      expect(platformerCameraX(300, mode, true)).toBe(platformerCameraX(900, mode, true));
      expect(platformerCameraX(1200, mode, true)).toBe(880);
      expect(platformerCameraX(9999, mode, true)).toBe(COURSES[mode].width - 1280);
    },
  );
});
