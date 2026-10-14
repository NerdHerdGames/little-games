import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import { MOON_RADIUS, moonPosition, ORBIT_RADIUS, viewDistance, type ExplorerState } from './rules';

const ASSET_PATH = `${import.meta.env.BASE_URL}assets/games/earth-moon-explorer/`;

/** Small, independently disposable 3D presentation. Phaser owns its update clock and navigation. */
export class EarthMoonView {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(36, 1, 0.05, 100);
  private readonly earth: Mesh<SphereGeometry, MeshStandardMaterial>;
  private readonly moon: Mesh<SphereGeometry, MeshStandardMaterial>;
  private readonly atmosphere: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly orbit: LineLoop;
  private readonly target = new Vector3();
  private readonly projected = new Vector3();
  private readonly resources: (BufferGeometry | Material | Texture)[] = [];
  private readonly observer: ResizeObserver;
  private readonly listeners = new AbortController();
  private readonly earthLabel: HTMLElement;
  private readonly moonLabel: HTMLElement;
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
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Three-dimensional Earth and Moon illuminated by sunlight',
    );
    this.host.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        onContextLost();
      },
      { signal: this.listeners.signal },
    );

    const earthGeometry = new SphereGeometry(1, 48, 32);
    const moonGeometry = new SphereGeometry(MOON_RADIUS, 32, 24);
    const earthMaterial = new MeshStandardMaterial({ roughness: 0.9 });
    const moonMaterial = new MeshStandardMaterial({ roughness: 1 });
    const atmosphereMaterial = new MeshBasicMaterial({
      color: 0x63b8f3,
      side: BackSide,
      transparent: true,
      opacity: 0.2,
    });
    this.resources.push(
      earthGeometry,
      moonGeometry,
      earthMaterial,
      moonMaterial,
      atmosphereMaterial,
    );
    this.earth = new Mesh(earthGeometry, earthMaterial);
    this.moon = new Mesh(moonGeometry, moonMaterial);
    this.atmosphere = new Mesh(earthGeometry, atmosphereMaterial);
    this.atmosphere.scale.setScalar(1.025);
    const earthAxis = new Group();
    earthAxis.rotation.z = (-23.4 * Math.PI) / 180;
    earthAxis.add(this.earth);
    this.scene.add(earthAxis, this.moon, this.atmosphere);
    this.scene.add(new AmbientLight(0xb8d2f2, 0.45));
    const sunlight = new DirectionalLight(0xfff6df, 3);
    sunlight.position.set(-3, 2, 5);
    this.scene.add(sunlight);

    const orbitVertices = new Float32Array(96 * 3);
    for (let index = 0; index < 96; index += 1) {
      const point = moonPosition((index / 96) * Math.PI * 2);
      orbitVertices.set([point.x, point.y, point.z], index * 3);
    }
    const orbitGeometry = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(orbitVertices, 3),
    );
    const orbitMaterial = new LineBasicMaterial({
      color: 0x83b4d9,
      transparent: true,
      opacity: 0.35,
    });
    this.resources.push(orbitGeometry, orbitMaterial);
    this.orbit = new LineLoop(orbitGeometry, orbitMaterial);
    this.scene.add(this.orbit);

    const stars = new Float32Array(220 * 3);
    for (let index = 0; index < 220; index += 1) {
      const latitude = Math.acos(1 - (2 * (index + 0.5)) / 220);
      const longitude = index * 2.399963;
      stars.set(
        [
          35 * Math.sin(latitude) * Math.cos(longitude),
          35 * Math.cos(latitude),
          35 * Math.sin(latitude) * Math.sin(longitude),
        ],
        index * 3,
      );
    }
    const starGeometry = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(stars, 3),
    );
    const starMaterial = new PointsMaterial({
      color: 0xbdd6e8,
      size: 0.065,
      sizeAttenuation: true,
    });
    this.resources.push(starGeometry, starMaterial);
    this.scene.add(new Points(starGeometry, starMaterial));

    this.earthLabel = document.createElement('span');
    this.moonLabel = document.createElement('span');
    this.earthLabel.className = this.moonLabel.className = 'earth-moon-world-label';
    this.earthLabel.textContent = 'Earth';
    this.moonLabel.textContent = 'Moon';
    this.host.append(this.earthLabel, this.moonLabel);
    this.observer = new ResizeObserver(() => {
      this.sizeDirty = true;
    });
    this.observer.observe(host);
  }

  get needsRender(): boolean {
    return this.sizeDirty;
  }

  async loadTextures(): Promise<void> {
    const [earth, moon] = await Promise.all([
      this.loadTexture('earth-color.jpg'),
      this.loadTexture('moon-color.jpg'),
    ]);
    if (this.disposed) return;
    this.earth.material.map = earth;
    this.moon.material.map = moon;
    this.earth.material.needsUpdate = this.moon.material.needsUpdate = true;
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
    const phase = state.moonPhase;
    this.moon.position.set(
      Math.cos(phase) * ORBIT_RADIUS,
      Math.sin(phase) * ORBIT_RADIUS * Math.sin((5.1 * Math.PI) / 180),
      Math.sin(phase) * ORBIT_RADIUS * Math.cos((5.1 * Math.PI) / 180),
    );
    this.earth.rotation.y = state.earthSpin;
    this.moon.rotation.set((-5.1 * Math.PI) / 180, Math.PI - phase, 0);
    this.earth.visible = this.atmosphere.visible = state.target !== 'moon';
    this.moon.visible = state.target !== 'earth';
    this.orbit.visible = state.showOrbit && state.target === 'system';
    if (state.target === 'moon') this.target.copy(this.moon.position);
    else this.target.set(state.target === 'system' ? 0.85 : 0, 0, 0);
    const distance = viewDistance(state) * Math.max(1, 0.9 / this.camera.aspect);
    const cosPitch = Math.cos(state.pitch);
    this.camera.position.set(
      this.target.x + distance * Math.sin(state.yaw) * cosPitch,
      this.target.y + distance * Math.sin(state.pitch),
      this.target.z + distance * Math.cos(state.yaw) * cosPitch,
    );
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
    this.positionLabel(this.earthLabel, this.earth, 1.15);
    this.positionLabel(this.moonLabel, this.moon, MOON_RADIUS + 0.12);
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
    this.renderer.domElement.remove();
    this.earthLabel.remove();
    this.moonLabel.remove();
  }

  private loadTexture(file: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const texture = new TextureLoader().load(`${ASSET_PATH}${file}`, resolve, undefined, () =>
        reject(new Error(`Could not load ${file}.`)),
      );
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      this.resources.push(texture);
    });
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
