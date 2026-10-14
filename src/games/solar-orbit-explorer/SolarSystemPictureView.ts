import { PLANETS, planetPosition, SUN_RADIUS, viewDistance, type ExplorerState } from './rules';

/** The orbit controls and facts remain usable on tablets without WebGL. */
export class SolarSystemPictureView {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private sizeDirty = true;

  constructor(private readonly host: HTMLElement) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Picture view is unavailable.');
    this.ctx = ctx;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Illustrated Sun and eight orbiting planets');
    host.replaceChildren(this.canvas);
    this.observer = new ResizeObserver(() => {
      this.sizeDirty = true;
    });
    this.observer.observe(host);
  }
  get needsRender(): boolean {
    return this.sizeDirty;
  }
  render(state: ExplorerState): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    if (this.sizeDirty) {
      const ratio = Math.min(window.devicePixelRatio, 1.5);
      this.canvas.width = width * ratio;
      this.canvas.height = height * ratio;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.sizeDirty = false;
    }
    const ctx = this.ctx;
    ctx.fillStyle = '#091425';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#7a98b7';
    for (let index = 0; index < 100; index += 1)
      ctx.fillRect((index * 137.3) % width, (index * 73.7) % height, 1.3, 1.3);
    const distance = viewDistance(state) * Math.max(1, 0.9 / (width / height));
    const focal = height / (2 * Math.tan(Math.PI / 10));
    const selectedIndex = PLANETS.findIndex((planet) => planet.id === state.target);
    const selected = PLANETS[selectedIndex];
    const target = selected
      ? planetPosition(selected, state.phases[selectedIndex] ?? selected.phase)
      : { x: 0, y: 0, z: 0 };
    const project = (x: number, z: number) => {
      const dx = x - target.x;
      const dz = z - target.z;
      const forward = dx * Math.sin(state.yaw) + dz * Math.cos(state.yaw);
      const depth = Math.max(0.05, distance - forward * Math.cos(state.pitch));
      const scale = focal / depth;
      return {
        x: width / 2 + (dx * Math.cos(state.yaw) - dz * Math.sin(state.yaw)) * scale,
        y: height / 2 + forward * Math.sin(state.pitch) * scale,
        scale,
        depth,
      };
    };
    if (state.target === 'system' && state.showOrbit) {
      ctx.strokeStyle = '#344960';
      ctx.lineWidth = 1;
      for (const planet of PLANETS) {
        ctx.beginPath();
        for (let index = 0; index <= 128; index += 1) {
          const point = planetPosition(planet, (index / 128) * Math.PI * 2);
          const p = project(point.x, point.z);
          if (index === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    }
    const bodies = [
      { id: 'sun', name: 'Sun', color: 0xffcc57, radius: SUN_RADIUS, position: project(0, 0) },
      ...PLANETS.map((planet, index) => {
        const point = planetPosition(planet, state.phases[index] ?? planet.phase);
        return { ...planet, position: project(point.x, point.z) };
      }),
    ]
      .filter((body) => state.target === 'system' || state.target === body.id)
      .sort((a, b) => b.position.depth - a.position.depth);
    for (const body of bodies) {
      const { x, y, scale } = body.position;
      const radius = Math.max(3, body.radius * scale);
      if (body.id === 'saturn') {
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.85, radius * 0.65, -0.25, 0, Math.PI * 2);
        ctx.strokeStyle = '#bba373';
        ctx.lineWidth = Math.max(2, radius * 0.25);
        ctx.stroke();
      }
      const gradient = ctx.createRadialGradient(
        x - radius * 0.3,
        y - radius * 0.3,
        0,
        x,
        y,
        radius,
      );
      gradient.addColorStop(0, `#${body.color.toString(16).padStart(6, '0')}`);
      gradient.addColorStop(1, body.id === 'sun' ? '#f8a73c' : '#162438');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f5f1e4';
      ctx.fillText(body.name, x, y + radius + 20);
    }
  }
  dispose(): void {
    this.observer.disconnect();
    this.canvas.remove();
  }
}
