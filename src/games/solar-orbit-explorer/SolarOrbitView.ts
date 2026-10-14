import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import {
  PLANETS,
  planetPosition,
  SUN_RADIUS,
  viewDistance,
  type ExplorerState,
  type Planet,
} from './rules';

interface Body {
  planet: Planet;
  mesh: Mesh<SphereGeometry, MeshStandardMaterial>;
  orbit: LineLoop;
  label: HTMLElement;
}

/** Locally drawn surface maps, with the existing NASA map reused for Earth. */
const surfaceMap = (planet: Planet): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Surface drawing is unavailable.');
  ctx.fillStyle = `#${planet.color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 512, 256);
  for (let row = 0; row < 256; row += 1) {
    const bands = planet.id === 'jupiter' || planet.id === 'saturn';
    const shade = Math.sin(row * (bands ? 0.16 : 0.032)) * (bands ? 0.18 : 0.04);
    ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(55,22,9,${-shade})`;
    ctx.fillRect(0, row, 512, 1);
  }
  if (planet.id === 'mercury' || planet.id === 'mars') {
    for (let index = 0; index < 75; index += 1) {
      ctx.beginPath();
      ctx.ellipse(
        (index * 137.3) % 512,
        (index * 47.7) % 256,
        2 + (index % 9),
        2 + (index % 7),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = 'rgba(50,24,16,0.15)';
      ctx.fill();
    }
  }
  if (planet.id === 'jupiter') {
    ctx.beginPath();
    ctx.ellipse(220, 158, 32, 13, -0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#a85032';
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

export class SolarOrbitView {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(36, 1, 0.03, 220);
  private readonly bodies: Body[] = [];
  private readonly sun: Mesh;
  private readonly glow: Mesh;
  private readonly rings: Mesh;
  private readonly sunLabel: HTMLElement;
  private readonly target = new Vector3();
  private readonly projected = new Vector3();
  private readonly resources: (BufferGeometry | Material | Texture)[] = [];
  private readonly observer: ResizeObserver;
  private readonly listeners = new AbortController();
  private disposed = false;
  private sizeDirty = true;
  private width = 1;
  private height = 1;

  constructor(
    private readonly host: HTMLElement,
    onContextLost: () => void,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x091425);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Three-dimensional Sun with eight planets orbiting around it',
    );
    host.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        onContextLost();
      },
      { signal: this.listeners.signal },
    );

    const sunGeometry = new SphereGeometry(SUN_RADIUS, 40, 24);
    const sunMaterial = new MeshBasicMaterial({ color: 0xffcc57 });
    const glowMaterial = new MeshBasicMaterial({
      color: 0xffad38,
      side: BackSide,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });
    this.resources.push(sunGeometry, sunMaterial, glowMaterial);
    this.sun = new Mesh(sunGeometry, sunMaterial);
    this.glow = new Mesh(sunGeometry, glowMaterial);
    this.glow.scale.setScalar(1.2);
    this.scene.add(this.sun, this.glow, new AmbientLight(0xc6daf4, 0.65));
    // Constant falloff is illustrative: distant planets stay readable on a small screen.
    this.scene.add(new PointLight(0xfff5df, 3, 0, 0));
    this.sunLabel = this.label('Sun');

    const ringGeometry = new RingGeometry(0.72, 1.06, 64);
    const ringMaterial = new MeshStandardMaterial({
      color: 0xbba373,
      side: DoubleSide,
      transparent: true,
      opacity: 0.8,
      roughness: 1,
    });
    this.resources.push(ringGeometry, ringMaterial);
    this.rings = new Mesh(ringGeometry, ringMaterial);
    this.rings.rotation.x = -Math.PI / 2 + 0.46;
    this.scene.add(this.rings);

    for (const planet of PLANETS) {
      const geometry = new SphereGeometry(planet.radius, 32, 20);
      const texture = surfaceMap(planet);
      const material = new MeshStandardMaterial({ map: texture, roughness: 1 });
      this.resources.push(geometry, texture, material);
      const mesh = new Mesh(geometry, material);
      mesh.rotation.z = planet.id === 'uranus' ? 1.7 : 0.15;
      const points = new Float32Array(128 * 3);
      for (let index = 0; index < 128; index += 1) {
        const point = planetPosition(planet, (index / 128) * Math.PI * 2);
        points.set([point.x, point.y, point.z], index * 3);
      }
      const orbitGeometry = new BufferGeometry().setAttribute(
        'position',
        new Float32BufferAttribute(points, 3),
      );
      const orbitMaterial = new LineBasicMaterial({
        color: 0x83b4d9,
        transparent: true,
        opacity: 0.25,
      });
      this.resources.push(orbitGeometry, orbitMaterial);
      const orbit = new LineLoop(orbitGeometry, orbitMaterial);
      this.scene.add(mesh, orbit);
      this.bodies.push({ planet, mesh, orbit, label: this.label(planet.name) });
    }
    const stars = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      const latitude = Math.acos(1 - (2 * (index + 0.5)) / 240);
      const longitude = index * 2.399963;
      stars.set(
        [
          100 * Math.sin(latitude) * Math.cos(longitude),
          100 * Math.cos(latitude),
          100 * Math.sin(latitude) * Math.sin(longitude),
        ],
        index * 3,
      );
    }
    const starGeometry = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(stars, 3),
    );
    const starMaterial = new PointsMaterial({ color: 0xbdd6e8, size: 0.14 });
    this.resources.push(starGeometry, starMaterial);
    this.scene.add(new Points(starGeometry, starMaterial));
    this.observer = new ResizeObserver(() => {
      this.sizeDirty = true;
    });
    this.observer.observe(host);
  }

  get needsRender(): boolean {
    return this.sizeDirty;
  }

  async loadTextures(): Promise<void> {
    const texture = await new Promise<Texture | undefined>((resolve) => {
      const pending = new TextureLoader().load(
        `${import.meta.env.BASE_URL}assets/games/earth-moon-explorer/earth-color.jpg`,
        (loaded) => resolve(loaded),
        undefined,
        () => resolve(undefined),
      );
      pending.colorSpace = SRGBColorSpace;
      pending.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      this.resources.push(pending);
    });
    const earth = this.bodies.find((body) => body.planet.id === 'earth');
    if (!this.disposed && earth && texture) {
      earth.mesh.material.map = texture;
      earth.mesh.material.needsUpdate = true;
    }
  }

  render(state: ExplorerState): void {
    if (this.disposed) return;
    if (this.sizeDirty) {
      this.width = Math.max(1, this.host.clientWidth);
      this.height = Math.max(1, this.host.clientHeight);
      this.renderer.setSize(this.width, this.height, false);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.sizeDirty = false;
    }
    this.target.set(0, 0, 0);
    this.sun.visible = this.glow.visible = state.target === 'system' || state.target === 'sun';
    for (const [index, body] of this.bodies.entries()) {
      const position = planetPosition(body.planet, state.phases[index] ?? body.planet.phase);
      body.mesh.position.set(position.x, position.y, position.z);
      body.mesh.rotation.y = state.spin;
      body.mesh.visible = state.target === 'system' || state.target === body.planet.id;
      body.orbit.visible = state.target === 'system' && state.showOrbit;
      if (body.planet.id === 'saturn') {
        this.rings.position.copy(body.mesh.position);
        this.rings.visible = body.mesh.visible;
      }
      if (body.planet.id === state.target) this.target.copy(body.mesh.position);
    }
    // Keep close-up cameras outside the surface at maximum zoom.
    const distance = viewDistance(state) * Math.max(1, 0.9 / this.camera.aspect);
    const cosPitch = Math.cos(state.pitch);
    this.camera.position.set(
      this.target.x + distance * Math.sin(state.yaw) * cosPitch,
      this.target.y + distance * Math.sin(state.pitch),
      this.target.z + distance * Math.cos(state.yaw) * cosPitch,
    );
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
    this.positionLabel(this.sunLabel, this.sun, SUN_RADIUS + 0.15);
    for (const body of this.bodies)
      this.positionLabel(body.label, body.mesh, body.planet.radius + 0.15);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.abort();
    this.observer.disconnect();
    for (const resource of this.resources) resource.dispose();
    this.resources.length = 0;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.host.replaceChildren();
  }

  private label(name: string): HTMLElement {
    const label = document.createElement('span');
    label.className = 'solar-orbit-world-label';
    label.textContent = name;
    this.host.append(label);
    return label;
  }
  private positionLabel(label: HTMLElement, mesh: Mesh, offset: number): void {
    this.projected.copy(mesh.position);
    this.projected.y -= offset;
    this.projected.project(this.camera);
    label.hidden =
      !mesh.visible ||
      Math.abs(this.projected.x) > 1 ||
      Math.abs(this.projected.y) > 1 ||
      Math.abs(this.projected.z) > 1;
    label.style.left = `${((this.projected.x + 1) / 2) * this.width}px`;
    label.style.top = `${((1 - this.projected.y) / 2) * this.height}px`;
  }
}
