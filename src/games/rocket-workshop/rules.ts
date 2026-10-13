import { SOLAR_SYSTEM_OBJECTS } from '../../data/solarSystem';

export const PART_SLOTS = ['nose', 'cabin', 'fins', 'engine'] as const;
export type PartSlot = (typeof PART_SLOTS)[number];

export interface RocketPart {
  id: string;
  name: string;
  description: string;
  mass: number;
  speed: number;
  stability: number;
  thrust: number;
}

export const ROCKET_PARTS: Readonly<Record<PartSlot, readonly RocketPart[]>> = {
  nose: [
    {
      id: 'pointed',
      name: 'Pointy nose',
      description: 'Slices ahead a little faster.',
      mass: 1,
      speed: 4,
      stability: 0,
      thrust: 0,
    },
    {
      id: 'round',
      name: 'Bubble nose',
      description: 'A round, steady ride.',
      mass: 2,
      speed: 1,
      stability: 2,
      thrust: 0,
    },
    {
      id: 'dish',
      name: 'Explorer dish',
      description: 'A curious, gently wobbly ride.',
      mass: 3,
      speed: 0,
      stability: -1,
      thrust: 0,
    },
  ],
  cabin: [
    {
      id: 'little',
      name: 'Little cabin',
      description: 'Light and quick to lift off.',
      mass: 2,
      speed: 3,
      stability: 0,
      thrust: 0,
    },
    {
      id: 'window',
      name: 'Window cabin',
      description: 'A comfy, balanced space ride.',
      mass: 4,
      speed: 1,
      stability: 1,
      thrust: 0,
    },
    {
      id: 'cargo',
      name: 'Cargo cabin',
      description: 'Big and heavy. A slower lift-off.',
      mass: 7,
      speed: 0,
      stability: 2,
      thrust: 0,
    },
  ],
  fins: [
    {
      id: 'swept',
      name: 'Swept fins',
      description: 'A little faster, a little wiggly.',
      mass: 2,
      speed: 3,
      stability: 1,
      thrust: 0,
    },
    {
      id: 'wide',
      name: 'Wide fins',
      description: 'A wonderfully steady ride.',
      mass: 4,
      speed: 0,
      stability: 5,
      thrust: 0,
    },
    {
      id: 'tiny',
      name: 'Tiny fins',
      description: 'Lightweight with a playful wobble.',
      mass: 1,
      speed: 2,
      stability: -2,
      thrust: 0,
    },
  ],
  engine: [
    {
      id: 'twin',
      name: 'Twin engine',
      description: 'Two flames. A balanced push.',
      mass: 3,
      speed: 2,
      stability: 1,
      thrust: 7,
    },
    {
      id: 'ion',
      name: 'Blue engine',
      description: 'A gentle push and a calm cruise.',
      mass: 2,
      speed: 0,
      stability: 3,
      thrust: 4,
    },
    {
      id: 'booster',
      name: 'Super booster',
      description: 'A big push for a speedy trip!',
      mass: 5,
      speed: 7,
      stability: -1,
      thrust: 12,
    },
  ],
};

export type RocketBuild = Record<PartSlot, number>;
export const createRocket = (): RocketBuild => ({ nose: 0, cabin: 1, fins: 0, engine: 0 });

export const getPart = (build: RocketBuild, slot: PartSlot): RocketPart => {
  const part = ROCKET_PARTS[slot][build[slot]];
  if (!part) throw new Error(`Unknown ${slot} piece.`);
  return part;
};

export const cyclePart = (build: RocketBuild, slot: PartSlot, direction: -1 | 1): RocketBuild => ({
  ...build,
  [slot]: (build[slot] + direction + ROCKET_PARTS[slot].length) % ROCKET_PARTS[slot].length,
});

export const getRocketStats = (build: RocketBuild) => {
  let mass = 0;
  let speed = 14;
  let stability = 0;
  let thrust = 0;
  for (const slot of PART_SLOTS) {
    const part = getPart(build, slot);
    mass += part.mass;
    speed += part.speed;
    stability += part.stability;
    thrust += part.thrust;
  }
  return {
    speed: speed - mass * 0.2,
    launchSeconds: 1.6 + mass / thrust,
    wobble: Math.max(0.5, 8 - stability),
    mass,
    thrust,
    stability,
  };
};

// These are short pretend trips, not real astronomical distances or travel times.
export const DESTINATIONS = SOLAR_SYSTEM_OBJECTS.filter(({ id }) => id !== 'sun').map(
  (world, index) => ({ ...world, distance: 165 + Math.abs(index - 2) * 11 }),
);
export type Destination = (typeof DESTINATIONS)[number];

export interface FlightPlan {
  destination: Destination;
  stats: ReturnType<typeof getRocketStats>;
  cruiseSeconds: number;
  approachSeconds: number;
  duration: number;
}

export const planFlight = (build: RocketBuild, destination: Destination): FlightPlan => {
  const stats = getRocketStats(build);
  const approachSeconds = 2.5;
  const cruiseSeconds =
    destination.distance / stats.speed - (stats.launchSeconds + approachSeconds) / 2;
  return {
    destination,
    stats,
    cruiseSeconds,
    approachSeconds,
    duration: stats.launchSeconds + cruiseSeconds + approachSeconds,
  };
};

export type FlightPhase = 'launch' | 'cruise' | 'approach' | 'arrived';

/** Sample a deterministic, accelerating-then-decelerating toy flight in seconds. */
export const sampleFlight = (plan: FlightPlan, elapsed: number) => {
  const time = Math.min(plan.duration, Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
  const { speed, launchSeconds, wobble } = plan.stats;
  const cruiseEnd = launchSeconds + plan.cruiseSeconds;
  let phase: FlightPhase;
  let distance: number;
  let velocity: number;
  if (time >= plan.duration) {
    phase = 'arrived';
    distance = plan.destination.distance;
    velocity = 0;
  } else if (time < launchSeconds) {
    phase = 'launch';
    velocity = (speed * time) / launchSeconds;
    distance = (speed * time * time) / (2 * launchSeconds);
  } else if (time < cruiseEnd) {
    phase = 'cruise';
    velocity = speed;
    distance = (speed * launchSeconds) / 2 + speed * (time - launchSeconds);
  } else {
    phase = 'approach';
    const remaining = plan.duration - time;
    velocity = (speed * remaining) / plan.approachSeconds;
    distance =
      plan.destination.distance - (speed * remaining * remaining) / (2 * plan.approachSeconds);
  }
  return {
    phase,
    progress: Math.min(1, distance / plan.destination.distance),
    velocity,
    wobble: phase === 'arrived' ? 0 : Math.sin(time * 2.3) * wobble * (velocity / speed),
  };
};
