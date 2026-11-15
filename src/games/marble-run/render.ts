import { getDefinition } from './registry';
import { worldPorts } from './connections';
import type { CameraController } from './camera';
import type { Marble, MarblePhysics } from './physics';
import { COLORS, type Piece, type Point, type RunDocument } from './types';
export interface RenderState {
  document: RunDocument;
  selected: string | undefined;
  preview: Piece | undefined;
  snapTarget: Point | undefined;
  invalid: boolean;
  building: boolean;
  reduced: boolean;
}
const symbols = ['●', '◆', '▲', '★', '♥', '☀', '✿'];
export const colorSymbol = (color: string): string =>
  symbols[COLORS.indexOf(color as (typeof COLORS)[number])] ?? '●';
/** Canvas drawing is separate from Matter bodies and construction state. */
export class RunRenderer {
  private context: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private ratio = 1;
  constructor(
    readonly canvas: HTMLCanvasElement,
    private camera: CameraController,
  ) {
    this.context = canvas.getContext('2d')!;
  }
  resize(): boolean {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight,
      r = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.width && h === this.height && r === this.ratio) return false;
    if (this.width > 0 && this.height > 0)
      this.camera.zoom = Math.max(
        0.2,
        Math.min(2.5, this.camera.zoom * Math.min(w / this.width, h / this.height)),
      );
    this.width = w;
    this.height = h;
    this.ratio = r;
    this.canvas.width = Math.round(w * r);
    this.canvas.height = Math.round(h * r);
    this.camera.width = w;
    this.camera.height = h;
    return true;
  }
  draw(state: RenderState, physics: MarblePhysics): void {
    const c = this.context,
      cam = this.camera;
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    c.fillStyle = '#f7f7ef';
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.translate(this.width / 2, this.height / 2);
    c.scale(cam.zoom, cam.zoom);
    c.translate(-cam.x, -cam.y);
    if (state.document.grid) {
      const top = cam.world({ x: 0, y: 0 }),
        bottom = cam.world({ x: this.width, y: this.height });
      c.fillStyle = '#cddbd1';
      const step = cam.zoom < 0.4 ? 100 : 40;
      for (let x = Math.floor(top.x / step) * step; x < bottom.x; x += step)
        for (let y = Math.floor(top.y / step) * step; y < bottom.y; y += step) {
          c.beginPath();
          c.arc(x, y, 1.3 / cam.zoom, 0, Math.PI * 2);
          c.fill();
        }
    }
    // Quiet ground marker remains in world space as the view is panned.
    c.strokeStyle = '#d7e1d7';
    c.lineWidth = 2 / cam.zoom;
    c.setLineDash([6 / cam.zoom, 8 / cam.zoom]);
    c.beginPath();
    c.moveTo(-200, 700);
    c.lineTo(1800, 700);
    c.stroke();
    c.setLineDash([]);
    for (const piece of state.document.pieces) {
      if (state.preview?.id === piece.id) continue;
      this.piece(
        piece,
        state.selected === piece.id,
        1,
        state.building ? undefined : physics.position(piece),
        physics,
        state,
      );
    }
    if (state.building) {
      for (const connection of state.document.connections) {
        const piece = state.document.pieces.find((p) => p.id === connection.a);
        if (!piece) continue;
        const port = worldPorts(piece).find((p) => p.id === connection.portA);
        if (!port) continue;
        c.fillStyle = '#fff';
        c.strokeStyle = '#368a70';
        c.lineWidth = 2 / cam.zoom;
        c.beginPath();
        c.arc(port.x, port.y, 5 / cam.zoom, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      if (state.preview && state.document.mode === 'snap') {
        for (const piece of state.document.pieces.filter((p) => p.id !== state.preview?.id))
          for (const port of worldPorts(piece)) {
            const occupied = state.document.connections.some(
              (link) =>
                (link.a === piece.id && link.portA === port.id) ||
                (link.b === piece.id && link.portB === port.id),
            );
            c.strokeStyle = occupied ? '#ba8282' : '#73ae9b';
            c.lineWidth = 2 / cam.zoom;
            c.beginPath();
            c.arc(port.x, port.y, 9 / cam.zoom, 0, Math.PI * 2);
            c.stroke();
            if (occupied) {
              c.beginPath();
              c.moveTo(port.x - 3 / cam.zoom, port.y - 3 / cam.zoom);
              c.lineTo(port.x + 3 / cam.zoom, port.y + 3 / cam.zoom);
              c.stroke();
            }
          }
      }
    }
    if (state.preview) this.piece(state.preview, true, 0.55, undefined, physics, state);
    if (state.snapTarget) {
      const p = state.snapTarget;
      c.strokeStyle = '#277a60';
      c.lineWidth = 3 / cam.zoom;
      c.beginPath();
      c.arc(p.x, p.y, 16 / cam.zoom, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#277a60';
      c.font = `bold ${16 / cam.zoom}px Arial`;
      c.fillText('✓', p.x + 20 / cam.zoom, p.y - 12 / cam.zoom);
    }
    for (const marble of physics.marbles)
      this.marble(marble, !state.reduced && state.document.marbles.trails);
    c.restore();
  }
  private piece(
    piece: Piece,
    selected: boolean,
    alpha: number,
    pose: { x: number; y: number; angle: number } | undefined,
    physics: MarblePhysics,
    state: RenderState,
  ): void {
    const c = this.context,
      def = getDefinition(piece.type),
      m = def.mechanic;
    const position = pose ?? piece;
    c.save();
    c.globalAlpha = alpha;
    c.translate(position.x, position.y);
    c.rotate(position.angle);
    c.scale(piece.scale, piece.scale);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (selected) {
      c.shadowColor = '#244a3c30';
      c.shadowBlur = 10;
      c.strokeStyle = state.invalid ? '#b94c4c' : '#256e5a';
      c.lineWidth = 3 / this.camera.zoom;
      c.setLineDash([6 / this.camera.zoom, 5 / this.camera.zoom]);
      const xs = def.paths.flat().map((p) => p.x),
        ys = def.paths.flat().map((p) => p.y);
      const x = Math.min(-40, ...xs) - 20,
        y = Math.min(-40, ...ys) - 20,
        w = Math.max(40, ...xs) - x + 20,
        h = Math.max(40, ...ys) - y + 20;
      c.strokeRect(x, y, w, h);
      c.setLineDash([]);
      c.shadowBlur = 0;
    }
    if (m === 'magnet' || m === 'repeller') {
      c.strokeStyle = def.color + '35';
      c.lineWidth = 2;
      for (const r of [60, 100, 150]) {
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.stroke();
      }
    }
    if (m === 'pendulum') {
      c.strokeStyle = '#8d9994';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(piece.x - position.x, piece.y - position.y);
      c.lineTo(0, 85);
      c.stroke();
      this.disk(0, 85, 24, def.color);
      this.disk(piece.x - position.x, piece.y - position.y, 7, '#456f60');
    } else if (m === 'dispenser') {
      c.fillStyle = '#d6e9df';
      c.strokeStyle = '#6c9c85';
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(-30, -38, 60, 60, 16);
      c.fill();
      c.stroke();
      this.disk(
        0,
        -12,
        15,
        state.document.experience === 'sorting' || state.document.experience === 'race'
          ? piece.props.color
          : state.document.marbles.color === 'rainbow'
            ? '#9566d6'
            : state.document.marbles.color,
      );
      c.fillStyle = '#466f5a';
      c.font = 'bold 24px Arial';
      c.textAlign = 'center';
      c.fillText('↓', 0, 22);
      c.font = 'bold 11px Arial';
      c.fillText('START', 0, -49);
    } else if (m === 'finish') {
      c.fillStyle = '#4c6871';
      c.fillRect(-4, -90, 8, 180);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4; col++) {
          c.fillStyle = (row + col) % 2 ? '#fff' : '#54756e';
          c.fillRect(4 + col * 15, -90 + row * 15, 15, 15);
        }
      c.fillStyle = '#355b50';
      c.font = 'bold 11px Arial';
      c.textAlign = 'center';
      c.fillText('FINISH', 22, 108);
    } else if (m === 'teleporter') {
      c.strokeStyle = piece.props.color === 'rainbow' ? def.color : piece.props.color;
      c.lineWidth = 10;
      c.beginPath();
      c.ellipse(0, 0, 28, 38, 0, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 2;
      c.strokeStyle = '#fff';
      c.stroke();
      c.fillStyle = '#486459';
      c.font = 'bold 22px Arial';
      c.textAlign = 'center';
      c.fillText(colorSymbol(piece.props.color), 0, 8);
    } else if (m === 'bumper' || m === 'magnet' || m === 'repeller' || m === 'counter') {
      this.disk(0, 0, m === 'bumper' ? 29 : 28, def.color);
      c.fillStyle = '#fff';
      c.font = 'bold 24px Arial';
      c.textAlign = 'center';
      c.fillText(m === 'counter' ? String(physics.counts.get(piece.id) ?? 0) : def.icon, 0, 8);
    } else {
      const open = m === 'gate' && (state.building ? piece.props.open : physics.gateOpen(piece.id));
      if (open) c.globalAlpha *= 0.3;
      for (const path of def.paths) {
        const stroke = (width: number, color: string, dy = 0): void => {
          c.beginPath();
          c.moveTo(path[0]!.x, path[0]!.y + dy);
          for (const p of path.slice(1)) c.lineTo(p.x, p.y + dy);
          c.lineWidth = width;
          c.strokeStyle = color;
          c.stroke();
        };
        stroke(19, '#284b3b18', 4);
        stroke(16, def.color);
        stroke(3, '#ffffff60', -4);
      }
      if (m === 'conveyor') {
        c.fillStyle = '#fff';
        c.font = 'bold 18px Arial';
        c.textAlign = 'center';
        c.fillText('»  »  »', 0, 5);
      }
      if (m === 'bell' || m === 'drum') {
        c.fillStyle = '#5c4d4a';
        c.font = 'bold 14px Arial';
        c.textAlign = 'center';
        c.fillText(
          m === 'drum' ? '◉' : ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C↑'][piece.props.note]!,
          0,
          -16,
        );
      }
      if (m === 'collector') {
        c.fillStyle = piece.props.color === 'rainbow' ? '#9566d6' : piece.props.color;
        c.beginPath();
        c.roundRect(-25, -10, 50, 28, 8);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 17px Arial';
        c.textAlign = 'center';
        c.fillText(`${colorSymbol(piece.props.color)} ${physics.counts.get(piece.id) ?? 0}`, 0, 10);
      }
      if (m === 'gate' || m === 'color-gate') {
        c.fillStyle = m === 'color-gate' ? piece.props.color : '#fff';
        c.strokeStyle = '#fff';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 0, 18, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = '#3b5351';
        c.font = 'bold 18px Arial';
        c.textAlign = 'center';
        c.fillText(m === 'color-gate' ? colorSymbol(piece.props.color) : open ? '○' : '⊣', 0, 6);
      }
      if (m === 'elevator' || m === 'moving' || m === 'seesaw' || m === 'spring' || m === 'plate') {
        c.fillStyle = '#4e6b60';
        c.font = 'bold 18px Arial';
        c.textAlign = 'center';
        c.fillText(def.icon, 0, 30);
      }
      if (m === 'domino') {
        c.fillStyle = '#fff';
        for (const y of [-20, 0, 20]) {
          c.beginPath();
          c.arc(0, y, 2.8, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    c.restore();
  }
  private disk(x: number, y: number, r: number, color: string): void {
    const c = this.context;
    c.fillStyle = '#24473522';
    c.beginPath();
    c.arc(x, y + 3, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffffff75';
    c.lineWidth = 2;
    c.stroke();
  }
  private marble(m: Marble, trail: boolean): void {
    const c = this.context,
      { x, y } = m.body.position,
      r = m.radius;
    if (trail && m.trail.length > 1) {
      c.lineWidth = r * 1.2;
      c.strokeStyle = m.color + '25';
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(m.trail[0]!.x, m.trail[0]!.y);
      for (const p of m.trail) c.lineTo(p.x, p.y);
      c.stroke();
    }
    c.save();
    c.translate(x, y);
    c.rotate(m.body.angle);
    c.shadowColor = '#244b4338';
    c.shadowBlur = 4;
    c.shadowOffsetY = 3;
    const gradient = c.createRadialGradient(-r * 0.4, -r * 0.4, 0, 0, 0, r);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(m.finish === 'metal' ? 0.35 : 0.25, m.color);
    gradient.addColorStop(1, m.finish === 'glass' ? m.color + '70' : m.color);
    c.fillStyle = gradient;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.strokeStyle = '#ffffff90';
    c.lineWidth = 1;
    c.stroke();
    if (m.finish === 'stripe') {
      c.save();
      c.clip();
      c.strokeStyle = '#ffffff90';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-r, -r);
      c.lineTo(r, r);
      c.moveTo(-r, 0);
      c.lineTo(0, r);
      c.stroke();
      c.restore();
    }
    c.fillStyle = '#ffffffbc';
    c.beginPath();
    c.ellipse(-r * 0.3, -r * 0.4, r * 0.27, r * 0.17, -0.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffffdc';
    c.strokeStyle = '#253e4160';
    c.lineWidth = 1;
    c.font = `bold ${Math.max(7, r)}px Arial`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.strokeText(colorSymbol(m.color), 0, 1);
    c.fillText(colorSymbol(m.color), 0, 1);
    c.restore();
  }
}
