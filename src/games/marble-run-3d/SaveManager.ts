import { APPEARANCES, DEFAULT_MARBLE, PHYSICS, type Construction, type TrackPiece } from './types';
import { REGISTRY } from './TrackPieceRegistry';
import { MAX_PIECES, reconcileConnections } from './ConnectionSystem3D';
import { emptyConstruction } from './ConstructionController3D';

export interface SavedRun {
  id: string;
  name: string;
  updated: number;
  data: Construction;
  thumbnail: string;
}
const KEY = 'little-games.marble-run-3d.v1';
const finiteArray = (value: unknown, length: number, max = 250): value is number[] =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
/** Treat persisted JSON as untrusted data; never reconstruct runtime objects from it. */
export function decodeConstruction(value: unknown): Construction | undefined {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.pieces) ||
    value.pieces.length > MAX_PIECES
  )
    return;
  const state = emptyConstruction();
  const ids = new Set<string>();
  for (const p of value.pieces as unknown[]) {
    if (
      !record(p) ||
      typeof p.id !== 'string' ||
      p.id.length > 80 ||
      ids.has(p.id) ||
      typeof p.type !== 'string' ||
      !REGISTRY.has(p.type) ||
      !finiteArray(p.position, 3) ||
      !finiteArray(p.rotation, 4, 1.001) ||
      typeof p.scale !== 'number' ||
      !Number.isFinite(p.scale) ||
      p.scale < 0.1 ||
      p.scale > 10
    )
      return;
    const norm = Math.hypot(...p.rotation);
    if (norm < 0.99 || norm > 1.01) return;
    ids.add(p.id);
    const settings = record(p.settings) ? p.settings : {};
    const piece: TrackPiece = {
      id: p.id,
      type: p.type,
      position: [...p.position] as TrackPiece['position'],
      rotation: p.rotation.map((n) => n / norm) as TrackPiece['rotation'],
      scale: p.scale,
      settings: {
        note:
          typeof settings.note === 'number' && Number.isFinite(settings.note)
            ? Math.max(36, Math.min(96, settings.note))
            : 60,
        strength:
          typeof settings.strength === 'number' && Number.isFinite(settings.strength)
            ? Math.max(1, Math.min(15, settings.strength))
            : 5,
        enabled: settings.enabled !== false,
        color: ['red', 'blue', 'green', 'yellow', 'orange', 'purple'].includes(
          String(settings.color),
        )
          ? String(settings.color)
          : 'red',
        link: typeof settings.link === 'string' && settings.link.length <= 80 ? settings.link : '',
      },
    };
    state.pieces.push(piece);
  }
  if (Array.isArray(value.connections)) {
    state.connections = reconcileConnections(
      value.connections.filter(
        (c: unknown) =>
          record(c) && ['a', 'b', 'portA', 'portB'].every((key) => typeof c[key] === 'string'),
      ) as Construction['connections'],
      state.pieces,
    );
  }
  state.buildMode = value.buildMode === 'free' ? 'free' : 'snap';
  if (['creative', 'race', 'music', 'sorting', 'chain'].includes(String(value.gameMode)))
    state.gameMode = value.gameMode as Construction['gameMode'];
  if (typeof value.physics === 'string' && value.physics in PHYSICS) state.physics = value.physics;
  if (record(value.marble)) {
    const m = value.marble;
    state.marble = {
      ...DEFAULT_MARBLE,
      appearance: APPEARANCES.includes(m.appearance as (typeof APPEARANCES)[number])
        ? String(m.appearance)
        : 'rainbow',
      size: bounded(m.size, 0.12, 0.3, 0.18),
      mass: bounded(m.mass, 0.1, 5, 1),
      bounce: bounded(m.bounce, 0, 0.85, 0.12),
      trails: m.trails === true,
      glow: m.glow === true,
      limit: Math.round(bounded(m.limit, 10, 80, 40)),
    };
  }
  if (record(value.camera) && finiteArray(value.camera.target, 3)) {
    state.camera = {
      target: [...value.camera.target] as Construction['camera']['target'],
      yaw: bounded(value.camera.yaw, -100, 100, -0.7),
      pitch: bounded(value.camera.pitch, 0.08, 1.56, 0.7),
      distance: bounded(value.camera.distance, 4, 110, 23),
    };
  }
  return state;
}
function bounded(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}
export class SaveManager {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {}
  list(): SavedRun[] {
    try {
      const parsed: unknown = JSON.parse(this.storage.getItem(KEY) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return (parsed as unknown[]).slice(0, 12).flatMap((item) => {
        if (
          !record(item) ||
          typeof item.id !== 'string' ||
          typeof item.name !== 'string' ||
          typeof item.updated !== 'number'
        )
          return [];
        const data = decodeConstruction(item.data);
        if (!data) return [];
        return [
          {
            id: item.id,
            name: item.name.slice(0, 40),
            updated: item.updated,
            data,
            thumbnail:
              typeof item.thumbnail === 'string' &&
              item.thumbnail.startsWith('data:image/') &&
              item.thumbnail.length < 180000
                ? item.thumbnail
                : '',
          },
        ];
      });
    } catch {
      return [];
    }
  }
  save(name: string, data: Construction, thumbnail = ''): void {
    const runs = this.list();
    const title = name.trim().slice(0, 40) || 'My marble run';
    const existing = runs.find((run) => run.name === title);
    const run: SavedRun = {
      id: existing?.id ?? crypto.randomUUID(),
      name: title,
      updated: Date.now(),
      data: structuredClone(data),
      thumbnail,
    };
    this.storage.setItem(
      KEY,
      JSON.stringify([run, ...runs.filter((r) => r.id !== run.id)].slice(0, 12)),
    );
  }
  delete(id: string): void {
    this.storage.setItem(KEY, JSON.stringify(this.list().filter((run) => run.id !== id)));
  }
}
