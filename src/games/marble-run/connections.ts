import { getDefinition } from './registry';
import type { Connection, Piece, Point, Port } from './types';
export const transform = (point: Point, piece: Piece): Point => ({
  x: piece.x + piece.scale * (point.x * Math.cos(piece.angle) - point.y * Math.sin(piece.angle)),
  y: piece.y + piece.scale * (point.x * Math.sin(piece.angle) + point.y * Math.cos(piece.angle)),
});
export const worldPorts = (piece: Piece): Port[] =>
  getDefinition(piece.type).ports.map((port) => ({
    ...port,
    ...transform(port, piece),
    angle: port.angle + piece.angle,
  }));
export interface SnapResult {
  piece: Piece;
  connection: Connection;
  target: Port;
}
export function findSnap(
  piece: Piece,
  others: readonly Piece[],
  connections: readonly Connection[],
  tolerance: number,
): SnapResult | undefined {
  let best: SnapResult | undefined;
  let distance = tolerance;
  for (const other of others) {
    if (other.id === piece.id) continue;
    for (const target of worldPorts(other)) {
      if (
        connections.some(
          (c) =>
            (c.a === other.id && c.portA === target.id) ||
            (c.b === other.id && c.portB === target.id),
        )
      )
        continue;
      for (const source of worldPorts(piece)) {
        if (!source.accepts.includes(target.type) || !target.accepts.includes(source.type))
          continue;
        const d = Math.hypot(source.x - target.x, source.y - target.y);
        if (d >= distance) continue;
        const local = getDefinition(piece.type).ports.find((p) => p.id === source.id)!;
        const aligned = { ...piece, angle: target.angle + Math.PI - local.angle, x: 0, y: 0 };
        const offset = transform(local, aligned);
        aligned.x = target.x - offset.x;
        aligned.y = target.y - offset.y;
        distance = d;
        best = {
          piece: aligned,
          target,
          connection: { a: other.id, portA: target.id, b: piece.id, portB: source.id },
        };
      }
    }
  }
  return best;
}
export function validConnections(
  pieces: readonly Piece[],
  connections: readonly Connection[],
): Connection[] {
  const occupied = new Set<string>();
  return connections.filter((c) => {
    const a = pieces.find((p) => p.id === c.a),
      b = pieces.find((p) => p.id === c.b);
    if (!a || !b || a === b) return false;
    const pa = worldPorts(a).find((p) => p.id === c.portA),
      pb = worldPorts(b).find((p) => p.id === c.portB);
    const ka = `${c.a}:${c.portA}`,
      kb = `${c.b}:${c.portB}`;
    if (
      !pa ||
      !pb ||
      occupied.has(ka) ||
      occupied.has(kb) ||
      !pa.accepts.includes(pb.type) ||
      Math.hypot(pa.x - pb.x, pa.y - pb.y) > 0.5 ||
      Math.cos(pa.angle - pb.angle) > -0.99
    )
      return false;
    occupied.add(ka);
    occupied.add(kb);
    return true;
  });
}
export const disconnect = (connections: Connection[], id: string): Connection[] =>
  connections.filter((c) => c.a !== id && c.b !== id);
export function segmentDistance(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
export function hitPiece(point: Point, piece: Piece, tolerance = 18): boolean {
  const definition = getDefinition(piece.type);
  if (!definition.paths.length)
    return Math.hypot(point.x - piece.x, point.y - piece.y) < Math.max(30 * piece.scale, tolerance);
  return definition.paths.some((path) =>
    path
      .slice(1)
      .some(
        (b, i) =>
          segmentDistance(point, transform(path[i]!, piece), transform(b, piece)) < tolerance,
      ),
  );
}
