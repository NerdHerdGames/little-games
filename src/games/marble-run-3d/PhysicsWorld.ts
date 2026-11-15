import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { definition, mechanismOffset } from './TrackPieceRegistry';
import { PHYSICS, type Construction, type TrackPiece } from './types';
import type { TrackPieceFactory } from './TrackPieceFactory';

const MARBLE_GROUP = 0x0001001f;
const TRACK_GROUP = 0x00020009;
const SENSOR_GROUP = 0x00040001;
const MECHANISM_GROUP = 0x0008000b;
const DECORATION_GROUP = 0x00100009;
const FIXED_STEP = 1 / 120;
export interface MarbleBody {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  active: boolean;
  index: number;
  radius: number;
  appearance: string;
  color: string;
  born: number;
  finished: boolean;
  source: number;
}
export interface MechanismBody {
  piece: TrackPiece;
  body: RAPIER.RigidBody;
  dynamic: RAPIER.RigidBody | undefined;
  enabled: boolean;
  hits: number;
}
export interface RunEvent {
  kind: 'click' | 'impact' | 'bell' | 'drum' | 'spring' | 'finish' | 'collect' | 'trigger';
  note: number;
  text: string;
}
export interface RaceResult {
  marble: number;
  source: number;
  time: number;
}

/** Fixed-step rigid bodies. Render meshes and device input never enter this system. */
export class PhysicsWorld {
  readonly world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly marbles: MarbleBody[] = [];
  readonly pieces = new Map<string, MechanismBody>();
  readonly results: RaceResult[] = [];
  readonly events: RunEvent[] = [];
  readonly queue = new RAPIER.EventQueue(true);
  readonly sensors = new Map<number, string>();
  playing = true;
  continuous = false;
  elapsed = 0;
  collected = 0;
  sorted = 0;
  private accumulator = 0;
  private pending: { at: number; source: number; startId?: string }[] = [];
  private continuousAt = 0;
  private raceStart = 0;
  private serial = 0;
  private readonly cooldowns = new Map<string, number>();
  private state: Construction;

  constructor(
    state: Construction,
    private readonly factory: TrackPieceFactory,
  ) {
    this.state = state;
    this.world.timestep = FIXED_STEP;
    this.world.numSolverIterations = 6;
    this.world.maxCcdSubsteps = 3;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(120, 0.2, 120)
        .setTranslation(0, -0.3, 0)
        .setFriction(0.4)
        .setCollisionGroups(TRACK_GROUP)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    );
    this.sync(state);
  }
  get activeCount(): number {
    return this.marbles.reduce((n, m) => n + Number(m.active), 0);
  }
  sync(state: Construction): void {
    this.state = state;
    const preset = PHYSICS[state.physics as keyof typeof PHYSICS] ?? PHYSICS.Normal;
    this.world.gravity = { x: 0, y: -preset.gravity, z: 0 };
    for (const marble of this.marbles) {
      marble.collider.setFriction(preset.friction);
      marble.collider.setRestitution(Math.min(0.95, state.marble.bounce * preset.bounce));
      marble.collider.setMass(state.marble.mass * preset.mass);
    }
    for (const [id, runtime] of this.pieces) {
      const next = state.pieces.find((p) => p.id === id);
      if (next && JSON.stringify(next) === JSON.stringify(runtime.piece)) continue;
      this.world.removeRigidBody(runtime.body);
      if (runtime.dynamic) this.world.removeRigidBody(runtime.dynamic);
      this.pieces.delete(id);
      for (const [handle, owner] of this.sensors) if (owner === id) this.sensors.delete(handle);
    }
    for (const piece of state.pieces) {
      if (this.pieces.has(piece.id)) continue;
      const def = definition(piece.type);
      const moving = ['rotate', 'seesaw', 'moving', 'elevator'].includes(def.behavior ?? '');
      const desc = moving
        ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        : RAPIER.RigidBodyDesc.fixed();
      desc.setTranslation(...piece.position).setRotation(new Quaternion(...piece.rotation));
      const body = this.world.createRigidBody(desc);
      if (def.paths.length || def.shape === 'funnel') {
        const g = this.factory.geometry(piece.type);
        const positions = Float32Array.from(
          g.getAttribute('position').array,
          (n) => n * piece.scale,
        );
        const indices = Uint32Array.from(g.getIndex()!.array);
        const collider = RAPIER.ColliderDesc.trimesh(
          positions,
          indices,
          RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES,
        )
          .setFriction(0.25)
          .setRestitution(0.06)
          .setCollisionGroups(TRACK_GROUP)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        this.world.createCollider(collider, body);
      } else {
        const [x, y, z] = def.dimensions!;
        const widthScale = def.shape === 'pillar' ? 1 : piece.scale;
        this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(
            (x * widthScale) / 2,
            (y * piece.scale) / 2,
            (z * widthScale) / 2,
          )
            .setTranslation(0, (y * piece.scale) / 2, 0)
            .setCollisionGroups(def.category === 'Decorations' ? DECORATION_GROUP : TRACK_GROUP),
          body,
        );
      }
      let dynamic: RAPIER.RigidBody | undefined;
      if (['gate', 'pendulum', 'domino', 'bumper', 'wheel'].includes(def.behavior ?? '')) {
        const origin = new Vector3(...mechanismOffset(def.behavior))
          .applyQuaternion(new Quaternion(...piece.rotation))
          .add(new Vector3(...piece.position));
        dynamic = this.world.createRigidBody(
          def.behavior === 'domino'
            ? RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(origin.x, origin.y, origin.z)
                .setRotation(new Quaternion(...piece.rotation))
            : RAPIER.RigidBodyDesc.kinematicPositionBased()
                .setTranslation(origin.x, origin.y, origin.z)
                .setRotation(new Quaternion(...piece.rotation)),
        );
        if (def.behavior === 'wheel') {
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.world.createCollider(
              RAPIER.ColliderDesc.cuboid(0.5, 0.08, 0.28)
                .setTranslation(0, Math.cos(angle) * 1.16, Math.sin(angle) * 1.16)
                .setRotation(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle))
                .setCollisionGroups(MECHANISM_GROUP)
                .setFriction(0.8),
              dynamic,
            );
          }
        } else {
          const collider =
            def.behavior === 'bumper'
              ? RAPIER.ColliderDesc.ball(0.3).setTranslation(0, 0.32, 1.2).setRestitution(0.95)
              : def.behavior === 'pendulum'
                ? RAPIER.ColliderDesc.ball(0.3).setTranslation(0, -0.9, 0).setRestitution(0.5)
                : RAPIER.ColliderDesc.cuboid(
                    def.behavior === 'domino' ? 0.3 : 0.58,
                    def.behavior === 'domino' ? 0.55 : 0.3,
                    0.09,
                  )
                    .setTranslation(0, def.behavior === 'domino' ? 0.55 : 0.28, 0.65)
                    .setMass(0.15);
          this.world.createCollider(collider.setCollisionGroups(MECHANISM_GROUP), dynamic);
        }
      }
      if (def.behavior && def.behavior !== 'dispenser' && def.paths.length) {
        const path = def.paths[0]!;
        const sample =
          path[Math.floor(path.length * (['sorter', 'gate'].includes(def.behavior) ? 0.18 : 0.6))]!;
        const p = new Vector3(...sample.position).multiplyScalar(piece.scale);
        const sensor = this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(0.65 * piece.scale, 0.65 * piece.scale, 0.32 * piece.scale)
            .setTranslation(p.x, p.y + 0.4 * piece.scale, p.z)
            .setRotation(new Quaternion(...sample.rotation))
            .setSensor(true)
            .setCollisionGroups(SENSOR_GROUP)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
          body,
        );
        this.sensors.set(sensor.handle, piece.id);
      }
      this.pieces.set(piece.id, {
        piece: structuredClone(piece),
        body,
        dynamic,
        enabled: piece.settings.enabled,
        hits: 0,
      });
    }
  }
  release(count: number, sourceId?: string): void {
    this.playing = true;
    if (this.activeCount === 0) {
      this.raceStart = this.elapsed;
      this.results.length = 0;
    }
    const sources = this.sources();
    const chosen = sourceId ? sources.findIndex((p) => p.id === sourceId) : -1;
    for (let wave = 0; wave < count; wave++) {
      const lanes =
        chosen >= 0 ? [chosen] : sourceId ? [0] : sources.length ? sources.map((_, i) => i) : [0];
      for (const source of lanes)
        if (this.pending.length + this.activeCount < this.state.marble.limit)
          this.pending.push({
            at: this.elapsed + wave * 0.45,
            source,
            ...(sourceId ? { startId: sourceId } : {}),
          });
    }
  }
  private sources(): TrackPiece[] {
    return this.state.pieces.filter(
      (p) => definition(p.type).behavior === 'dispenser' && p.settings.enabled,
    );
  }
  private spawn(source: number, startId?: string): void {
    if (this.activeCount >= this.state.marble.limit) return;
    const sources = this.sources();
    const start =
      (startId ? this.state.pieces.find((p) => p.id === startId) : sources[source]) ??
      this.state.pieces.find((p) => definition(p.type).paths.length);
    const radius = this.state.marble.size;
    let position = new Vector3(0, 5, 0);
    const velocity = new Vector3(0, 0, 0.5);
    if (start) {
      const first = definition(start.type).paths[0]![0]!;
      position = new Vector3(...first.position)
        .add(new Vector3(0, radius + 0.12, 0.15).applyQuaternion(new Quaternion(...first.rotation)))
        .multiplyScalar(start.scale)
        .applyQuaternion(new Quaternion(...start.rotation))
        .add(new Vector3(...start.position));
      velocity
        .applyQuaternion(new Quaternion(...first.rotation))
        .applyQuaternion(new Quaternion(...start.rotation));
    }
    const preset = PHYSICS[this.state.physics as keyof typeof PHYSICS] ?? PHYSICS.Normal;
    let marble = this.marbles.find((m) => !m.active);
    if (!marble) {
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setCcdEnabled(true)
          .setCanSleep(true)
          .setLinearDamping(0.015)
          .setAngularDamping(0.025),
      );
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.ball(radius)
          .setCollisionGroups(MARBLE_GROUP)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body,
      );
      marble = {
        body,
        collider,
        active: true,
        index: 0,
        radius,
        appearance: '',
        color: '',
        born: 0,
        finished: false,
        source,
      };
      this.marbles.push(marble);
    }
    const appearance = this.state.marble.appearance;
    Object.assign(marble, {
      active: true,
      index: this.serial++,
      radius,
      appearance,
      color:
        appearance in { red: 1, blue: 1, green: 1, yellow: 1, orange: 1, purple: 1 }
          ? appearance
          : ['red', 'blue', 'green', 'yellow', 'purple'][this.serial % 5]!,
      born: this.elapsed,
      finished: false,
      source,
    });
    marble.body.setEnabled(true);
    marble.body.setTranslation(position, true);
    marble.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    marble.body.setLinvel(velocity, true);
    marble.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    marble.body.resetForces(true);
    marble.body.resetTorques(true);
    marble.collider.setShape(new RAPIER.Ball(radius));
    marble.collider.setMass(this.state.marble.mass * preset.mass);
    marble.collider.setFriction(preset.friction);
    marble.collider.setRestitution(Math.min(0.95, this.state.marble.bounce * preset.bounce));
  }
  reset(): void {
    for (const m of this.marbles) this.park(m);
    this.pending = [];
    this.continuous = false;
    this.results.length = 0;
    this.cooldowns.clear();
    this.collected = 0;
    this.sorted = 0;
    this.accumulator = 0;
    for (const runtime of this.pieces.values()) {
      runtime.hits = 0;
      runtime.enabled = runtime.piece.settings.enabled;
      if (runtime.dynamic) {
        runtime.dynamic.setTranslation(
          new Vector3(...mechanismOffset(definition(runtime.piece.type).behavior))
            .applyQuaternion(new Quaternion(...runtime.piece.rotation))
            .add(new Vector3(...runtime.piece.position)),
          true,
        );
        runtime.dynamic.setRotation(new Quaternion(...runtime.piece.rotation), true);
        runtime.dynamic.setLinvel({ x: 0, y: 0, z: 0 }, true);
        runtime.dynamic.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }
  private park(marble: MarbleBody): void {
    marble.active = false;
    marble.body.setEnabled(false);
    for (const key of this.cooldowns.keys())
      if (key.startsWith(`${marble.index}:`)) this.cooldowns.delete(key);
  }
  advance(seconds: number): void {
    if (!this.playing) return;
    this.accumulator += Math.min(seconds, 0.05);
    while (this.accumulator >= FIXED_STEP) {
      this.accumulator -= FIXED_STEP;
      this.elapsed += FIXED_STEP;
      if (this.continuous && this.elapsed >= this.continuousAt) {
        this.release(1);
        this.continuousAt = this.elapsed + 0.75;
      }
      const ready = this.pending.filter((p) => p.at <= this.elapsed);
      this.pending = this.pending.filter((p) => p.at > this.elapsed);
      for (const p of ready) this.spawn(p.source, p.startId);
      this.animateMechanisms();
      this.world.step(this.queue);
      this.queue.drainCollisionEvents((a, b, started) => {
        if (started) this.collision(a, b);
      });
      for (const m of this.marbles) {
        if (!m.active) continue;
        const p = m.body.translation();
        if (this.elapsed - m.born > 75 || p.y < -2 || Math.abs(p.x) > 110 || Math.abs(p.z) > 110)
          this.park(m);
      }
    }
  }
  private animateMechanisms(): void {
    for (const runtime of this.pieces.values()) {
      const { piece, body, dynamic, enabled } = runtime;
      const behavior = definition(piece.type).behavior;
      if (
        !['rotate', 'wheel', 'seesaw', 'moving', 'elevator', 'gate', 'pendulum', 'magnet'].includes(
          behavior ?? '',
        )
      )
        continue;
      const position = new Vector3(...piece.position),
        rotation = new Quaternion(...piece.rotation);
      if (enabled) {
        if (behavior === 'rotate')
          rotation.multiply(
            new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.elapsed * 0.6),
          );
        if (behavior === 'seesaw')
          rotation.multiply(
            new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.sin(this.elapsed) * 0.25),
          );
        if (behavior === 'moving')
          position.add(new Vector3(Math.sin(this.elapsed) * 1.2, 0, 0).applyQuaternion(rotation));
        if (behavior === 'elevator') position.y += (1 - Math.cos(this.elapsed * 0.8)) * 1.5;
      }
      if (body.isKinematic()) {
        body.setNextKinematicTranslation(position);
        body.setNextKinematicRotation(rotation);
      }
      if (dynamic?.isKinematic()) {
        position.add(
          new Vector3(...mechanismOffset(behavior)).applyQuaternion(
            new Quaternion(...piece.rotation),
          ),
        );
        if (behavior === 'gate' && enabled)
          position.add(new Vector3(0, 1.3, 0).applyQuaternion(rotation));
        if (behavior === 'wheel' && enabled)
          rotation.multiply(
            new Quaternion().setFromAxisAngle(
              new Vector3(1, 0, 0),
              -this.elapsed * 0.15 * piece.settings.strength,
            ),
          );
        if (behavior === 'pendulum' && enabled)
          rotation.multiply(
            new Quaternion().setFromAxisAngle(
              new Vector3(0, 0, 1),
              Math.sin(this.elapsed * 1.8) * 0.9,
            ),
          );
        dynamic.setNextKinematicTranslation(position);
        dynamic.setNextKinematicRotation(rotation);
      }
      if (behavior === 'magnet' && enabled) {
        const center = new Vector3(0, 0.3, 1.2).applyQuaternion(rotation).add(position);
        for (const m of this.marbles) {
          if (!m.active) continue;
          const delta = center.clone().sub(m.body.translation());
          if (delta.lengthSq() < 6.25)
            m.body.applyImpulse(
              delta.multiplyScalar(FIXED_STEP * piece.settings.strength * 0.3),
              true,
            );
        }
      }
    }
  }
  private collision(a: number, b: number): void {
    const m = this.marbles.find(
      (m) => m.active && (m.collider.handle === a || m.collider.handle === b),
    );
    if (!m) return;
    const sensorId = this.sensors.get(a) ?? this.sensors.get(b);
    if (!sensorId) {
      if (new Vector3().copy(m.body.linvel()).length() > 0.7 && this.events.length < 6)
        this.events.push({ kind: 'impact', note: 44, text: '' });
      return;
    }
    const runtime = this.pieces.get(sensorId);
    if (!runtime) return;
    const key = `${m.index}:${sensorId}`;
    if ((this.cooldowns.get(key) ?? -100) + 1 > this.elapsed) return;
    this.cooldowns.set(key, this.elapsed);
    const { piece } = runtime,
      behavior = definition(piece.type).behavior;
    if (!runtime.enabled) return;
    runtime.hits++;
    const rotation = new Quaternion(...piece.rotation);
    if (behavior === 'finish' && !m.finished) {
      m.finished = true;
      this.results.push({ marble: m.index, source: m.source, time: this.elapsed - this.raceStart });
      this.events.push({
        kind: 'finish',
        note: 79,
        text:
          this.state.gameMode === 'race'
            ? `Lane ${m.source + 1} finished in ${(this.elapsed - this.raceStart).toFixed(2)}s!`
            : 'Through the finish! Hooray!',
      });
    } else if (behavior === 'collector') {
      this.collected++;
      if (m.color === piece.settings.color) this.sorted++;
      this.events.push({
        kind: 'collect',
        note: 72,
        text:
          this.state.gameMode === 'sorting'
            ? `${m.color === piece.settings.color ? 'A matching marble!' : 'Try another route!'} ${this.sorted} matched`
            : `${this.collected} marbles collected`,
      });
      this.park(m);
    } else if (behavior === 'bell' || behavior === 'drum') {
      this.events.push({ kind: behavior, note: piece.settings.note, text: '' });
    } else if (behavior === 'spring' || behavior === 'trampoline') {
      m.body.applyImpulse(
        new Vector3(
          0,
          piece.settings.strength * 0.8,
          behavior === 'spring' ? piece.settings.strength * 0.8 : 0,
        ).applyQuaternion(rotation),
        true,
      );
      this.events.push({ kind: 'spring', note: 76, text: 'Boing!' });
    } else if (behavior === 'conveyor') {
      m.body.setLinvel(new Vector3(0, 0, piece.settings.strength).applyQuaternion(rotation), true);
    } else if (behavior === 'teleporter') {
      const target =
        this.pieces.get(piece.settings.link) ??
        [...this.pieces.values()].find(
          (r) => r.piece.id !== piece.id && r.piece.type === 'teleporter',
        );
      if (target) {
        m.body.setTranslation(
          new Vector3(0, m.radius + 0.2, 1.8)
            .applyQuaternion(new Quaternion(...target.piece.rotation))
            .add(new Vector3(...target.piece.position)),
          true,
        );
        m.body.setLinvel(
          new Vector3(0, 0, 1.5).applyQuaternion(new Quaternion(...target.piece.rotation)),
          true,
        );
        this.cooldowns.set(`${m.index}:${target.piece.id}`, this.elapsed + 1);
      }
    } else if (behavior === 'sorter') {
      const direction = m.color === piece.settings.color ? -1 : 1;
      const speed = Math.max(1.4, new Vector3().copy(m.body.linvel()).length());
      m.body.setLinvel(
        new Vector3(direction * 0.7, -0.15, 1.5)
          .normalize()
          .multiplyScalar(speed)
          .applyQuaternion(rotation),
        true,
      );
    } else if (behavior === 'trigger' || behavior === 'switch') {
      const target = this.pieces.get(piece.settings.link);
      if (target) {
        target.enabled = !target.enabled;
        this.events.push({ kind: 'trigger', note: 68, text: 'Click! A machine changed.' });
      }
    }
  }
  dispose(): void {
    this.queue.free();
    this.world.free();
    this.pieces.clear();
    this.sensors.clear();
    this.marbles.length = 0;
    this.cooldowns.clear();
  }
}
let initialization: Promise<void> | undefined;
export function initializePhysics(): Promise<void> {
  initialization ??= RAPIER.init();
  return initialization;
}
