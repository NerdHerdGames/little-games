import { PIECES } from './registry';
import { validConnections } from './connections';
import { COLORS, copy, defaultDocument, type RunDocument } from './types';
import type { KeyValueStorage } from '../../core/Preferences';
export const MAX_PIECES = 300;
export const MAX_MARBLES = 100;
const KEY = 'little-games-marble-runs-v1';
const numberIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
/** Validate untrusted browser storage before constructing any physics bodies. */
export function parseDocument(value: unknown): RunDocument | undefined {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.pieces) ||
    value.pieces.length > MAX_PIECES ||
    !Array.isArray(value.connections) ||
    value.connections.length > MAX_PIECES * 3
  )
    return;
  const ids = new Set<string>();
  for (const p of value.pieces) {
    if (
      !record(p) ||
      typeof p.id !== 'string' ||
      p.id.length > 80 ||
      ids.has(p.id) ||
      !PIECES.some((d) => d.type === p.type) ||
      !numberIn(p.x, -6000, 6000) ||
      !numberIn(p.y, -6000, 6000) ||
      !numberIn(p.angle, -1000, 1000) ||
      !numberIn(p.scale, 0.5, 2.5) ||
      !record(p.props) ||
      !COLORS.includes(p.props.color as (typeof COLORS)[number]) ||
      !numberIn(p.props.note, 0, 7) ||
      !Number.isInteger(p.props.note) ||
      !numberIn(p.props.power, 0.5, 2) ||
      typeof p.props.open !== 'boolean'
    )
      return;
    ids.add(p.id);
  }
  if (
    value.connections.some(
      (c) => !record(c) || !['a', 'b', 'portA', 'portB'].every((k) => typeof c[k] === 'string'),
    )
  )
    return;
  const m = value.marbles;
  if (
    !record(m) ||
    !COLORS.includes(m.color as (typeof COLORS)[number]) ||
    !numberIn(m.size, 7, 17) ||
    !numberIn(m.weight, 0.5, 3) ||
    !numberIn(m.bounce, 0, 0.9) ||
    !numberIn(m.speed, -8, 8) ||
    !['glossy', 'metal', 'glass', 'stripe'].includes(String(m.finish)) ||
    typeof m.trails !== 'boolean' ||
    !['snap', 'free'].includes(String(value.mode)) ||
    !['sandbox', 'race', 'music', 'sorting', 'chain'].includes(String(value.experience)) ||
    !numberIn(value.gravity, 0.3, 1.8) ||
    typeof value.grid !== 'boolean'
  )
    return;
  const document = copy(value as unknown as RunDocument);
  document.connections = validConnections(document.pieces, document.connections);
  return document;
}
export interface SavedRun {
  id: string;
  name: string;
  updated: number;
  document: RunDocument;
}
export class SaveManager {
  constructor(private readonly storage: KeyValueStorage) {}
  list(): SavedRun[] {
    try {
      const raw: unknown = JSON.parse(this.storage.getItem(KEY) ?? '[]');
      if (!Array.isArray(raw)) return [];
      return raw.slice(0, 24).flatMap((r: unknown) => {
        if (
          !record(r) ||
          typeof r.id !== 'string' ||
          !/^[a-zA-Z0-9-]{1,80}$/.test(r.id) ||
          typeof r.name !== 'string' ||
          !numberIn(r.updated, 0, Number.MAX_SAFE_INTEGER)
        )
          return [];
        const document = parseDocument(r.document);
        return document
          ? [{ id: r.id, name: r.name.slice(0, 48), updated: r.updated, document }]
          : [];
      });
    } catch {
      return [];
    }
  }
  save(name: string, document: RunDocument, id: string): void {
    if (!parseDocument(document)) throw new Error('This creation could not be saved.');
    const runs = this.list().filter((r) => r.id !== id);
    if (runs.length >= 24) throw new Error('Your shelf is full. Remove a saved run to make room.');
    runs.unshift({
      id,
      name: name.trim().slice(0, 48) || 'My marble run',
      updated: Date.now(),
      document: copy(document),
    });
    this.storage.setItem(KEY, JSON.stringify(runs));
  }
  remove(id: string): void {
    this.storage.setItem(KEY, JSON.stringify(this.list().filter((r) => r.id !== id)));
  }
  draft(document: RunDocument): void {
    this.storage.setItem(`${KEY}-draft`, JSON.stringify(document));
  }
  restore(): RunDocument | undefined {
    try {
      return parseDocument(JSON.parse(this.storage.getItem(`${KEY}-draft`) ?? 'null'));
    } catch {
      return;
    }
  }
  guided(): boolean {
    try {
      return this.storage.getItem(`${KEY}-guided`) === 'yes';
    } catch {
      return false;
    }
  }
  finishGuide(): void {
    try {
      this.storage.setItem(`${KEY}-guided`, 'yes');
    } catch {
      /* Play remains available without storage. */
    }
  }
}
export class History {
  private past: RunDocument[] = [];
  private future: RunDocument[] = [];
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  push(document: RunDocument): void {
    this.past.push(copy(document));
    if (this.past.length > 60) this.past.shift();
    this.future = [];
  }
  undo(current: RunDocument): RunDocument {
    const next = this.past.pop();
    if (!next) return current;
    this.future.push(copy(current));
    return next;
  }
  redo(current: RunDocument): RunDocument {
    const next = this.future.pop();
    if (!next) return current;
    this.past.push(copy(current));
    return next;
  }
}
export const newDocument = defaultDocument;
