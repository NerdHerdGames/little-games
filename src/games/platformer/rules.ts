export type PlatformerMode = 'manual' | 'runner';

export interface Platform {
  x: number;
  width: number;
  top: number;
}

export interface PlatformerCourse {
  platforms: readonly Platform[];
  finishX: number;
  width: number;
}

export const PLAYER_HALF_WIDTH = 22;
export const PLAYER_HEIGHT = 50;
export const PHYSICS_STEP = 1 / 120;
const GRAVITY = 1600;
const JUMP_SPEED = 640;

export const COURSES: Readonly<Record<PlatformerMode, PlatformerCourse>> = {
  manual: {
    platforms: [
      { x: 0, width: 520, top: 540 },
      { x: 630, width: 300, top: 480 },
      { x: 1040, width: 320, top: 420 },
      { x: 1490, width: 400, top: 500 },
      { x: 1990, width: 320, top: 440 },
      { x: 2420, width: 560, top: 520 },
    ],
    finishX: 2810,
    width: 3100,
  },
  runner: {
    platforms: [
      { x: 0, width: 620, top: 540 },
      { x: 730, width: 560, top: 540 },
      { x: 1400, width: 560, top: 510 },
      { x: 2070, width: 600, top: 540 },
      { x: 2780, width: 640, top: 520 },
    ],
    finishX: 3260,
    width: 3550,
  },
};

export interface PlatformerState {
  x: number;
  /** Feet position, increasing downward. */
  y: number;
  velocityY: number;
  grounded: boolean;
  coyoteTime: number;
  jumpBuffer: number;
  checkpoint: number;
  collected: boolean[];
  rescues: number;
  complete: boolean;
}

export interface PlatformerInput {
  direction: number;
  jumpPressed: boolean;
}

export function createPlatformer(mode: PlatformerMode): PlatformerState {
  return {
    x: 100,
    y: COURSES[mode].platforms[0]!.top,
    velocityY: 0,
    grounded: true,
    coyoteTime: 0.1,
    jumpBuffer: 0,
    checkpoint: 0,
    collected: COURSES[mode].platforms.map(() => false),
    rescues: 0,
    complete: false,
  };
}

/** Fixed, device-independent steps keep jumps the same on slow and fast screens. */
export function stepPlatformer(
  state: PlatformerState,
  mode: PlatformerMode,
  input: PlatformerInput,
): 'checkpoint' | 'rescue' | 'complete' | undefined {
  if (state.complete) return;
  const course = COURSES[mode];
  const dt = PHYSICS_STEP;
  const previousY = state.y;
  state.jumpBuffer = input.jumpPressed ? 0.12 : Math.max(0, state.jumpBuffer - dt);
  state.coyoteTime = state.grounded ? 0.1 : Math.max(0, state.coyoteTime - dt);
  if (state.jumpBuffer > 0 && state.coyoteTime > 0) {
    state.velocityY = -JUMP_SPEED;
    state.grounded = false;
    state.coyoteTime = 0;
    state.jumpBuffer = 0;
  }
  const direction = mode === 'runner' ? 1 : Math.max(-1, Math.min(1, input.direction));
  const speed = mode === 'runner' ? 240 : 300;
  state.x = Math.max(
    PLAYER_HALF_WIDTH,
    Math.min(course.width - PLAYER_HALF_WIDTH, state.x + direction * speed * dt),
  );
  state.velocityY += GRAVITY * dt;
  state.y += state.velocityY * dt;
  state.grounded = false;
  let checkpointReached = false;
  // Platforms are one-way: jumping up through them is allowed; falling lands on top.
  for (const [index, platform] of course.platforms.entries()) {
    if (
      state.velocityY >= 0 &&
      previousY <= platform.top &&
      state.y >= platform.top &&
      state.x + PLAYER_HALF_WIDTH > platform.x &&
      state.x - PLAYER_HALF_WIDTH < platform.x + platform.width
    ) {
      state.y = platform.top;
      state.velocityY = 0;
      state.grounded = true;
      if (
        index > state.checkpoint &&
        state.x >= platform.x + PLAYER_HALF_WIDTH &&
        state.x <= platform.x + platform.width - PLAYER_HALF_WIDTH
      ) {
        state.checkpoint = index;
        checkpointReached = true;
      }
    }
    const starX = platform.x + platform.width / 2;
    if (
      Math.abs(state.x - starX) < 42 &&
      Math.abs(state.y - PLAYER_HEIGHT / 2 - (platform.top - 70)) < 52
    )
      state.collected[index] = true;
  }
  if (state.y > 760) {
    const checkpoint = course.platforms[state.checkpoint]!;
    state.x = checkpoint.x + 90;
    state.y = checkpoint.top;
    state.velocityY = 0;
    state.grounded = true;
    state.coyoteTime = 0.1;
    state.jumpBuffer = 0;
    state.rescues += 1;
    return 'rescue';
  }
  if (state.x >= course.finishX && state.grounded) {
    state.complete = true;
    return 'complete';
  }
  return checkpointReached ? 'checkpoint' : undefined;
}

/** Still view uses overlapping fixed rooms; ordinary view follows essential horizontal movement. */
export function platformerCameraX(x: number, mode: PlatformerMode, reducedMotion: boolean): number {
  const offset = reducedMotion ? Math.floor(Math.max(0, x - 120) / 880) * 880 : x - 300;
  return Math.max(0, Math.min(COURSES[mode].width - 1280, offset));
}
