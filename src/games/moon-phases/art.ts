import { MOON_PHASES, type MoonPhaseId } from './rules';

/** Local, schematic Northern Hemisphere views; waxing is bright on the right. */
export function moonLightPath(id: MoonPhaseId, radius = 42): string {
  const index = MOON_PHASES.findIndex((phase) => phase.id === id);
  if (index === 0) return '';
  const terminator = Math.cos((index * Math.PI) / 4);
  const direction = index <= 4 ? 1 : -1;
  const points: string[] = [];
  for (let step = 0; step <= 48; step++) {
    const angle = -Math.PI / 2 + (step / 48) * Math.PI;
    points.push(
      `${(direction * radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  for (let step = 48; step >= 0; step--) {
    const angle = -Math.PI / 2 + (step / 48) * Math.PI;
    points.push(
      `${(direction * terminator * radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return `M${points.join(' L')} Z`;
}

// A shared, locally drawn lunar face: darker maria, crater rims, and a shaded limb.
// Grouping the pixels by shade keeps each illustration to a handful of SVG paths.
const MOON_PALETTE = [
  '#626773',
  '#747985',
  '#878c96',
  '#999ea7',
  '#aab0b8',
  '#bcc1c8',
  '#cdd1d7',
  '#dde0e4',
  '#eceef0',
];
const MARIA = [
  { x: -15, y: -15, rx: 18, ry: 15 },
  { x: 10, y: -22, rx: 14, ry: 10 },
  { x: -23, y: 5, rx: 12, ry: 17 },
  { x: 16, y: -5, rx: 12, ry: 11 },
];
const CRATERS = [
  { x: -23, y: -22, r: 6 },
  { x: 6, y: -14, r: 5 },
  { x: 25, y: 7, r: 7 },
  { x: -9, y: 22, r: 9 },
  { x: -27, y: 14, r: 4 },
  { x: 12, y: 30, r: 4 },
  { x: 1, y: 5, r: 3 },
];

function createMoonSurface(): string {
  const shades: string[][] = MOON_PALETTE.map(() => []);
  for (let y = -42; y < 42; y += 3) {
    for (let x = -42; x < 42; x += 3) {
      const cx = x + 1.5;
      const cy = y + 1.5;
      const distance = Math.hypot(cx, cy);
      if (distance > 41) continue;
      let brightness = 4 + 4 * Math.sqrt(1 - (distance / 42) ** 2);
      for (const mare of MARIA) {
        if (((cx - mare.x) / mare.rx) ** 2 + ((cy - mare.y) / mare.ry) ** 2 < 1) brightness -= 2;
      }
      for (const crater of CRATERS) {
        const depth = Math.hypot(cx - crater.x, cy - crater.y) / crater.r;
        if (depth < 0.72) brightness -= 2.5;
        else if (depth < 1.15) brightness += cy < crater.y ? 1.5 : -1;
      }
      // Fixed grain gives every phase the same face, including when dragged.
      brightness += Math.sin(cx * 17 + cy * 31) * 0.6;
      const shade = Math.max(0, Math.min(MOON_PALETTE.length - 1, Math.round(brightness)));
      shades[shade]!.push(`M${x},${y}h3v3h-3Z`);
    }
  }
  return shades
    .map((pixels, index) => `<path fill="${MOON_PALETTE[index]}" d="${pixels.join('')}"/>`)
    .join('');
}

const MOON_SURFACE = createMoonSurface();

export function moonArt(id: MoonPhaseId): string {
  const index = MOON_PHASES.findIndex((phase) => phase.id === id);
  const shadow = MOON_PHASES[(index + 4) % MOON_PHASES.length]!.id;
  return `<circle r="43" fill="#717783"/>${MOON_SURFACE}<path d="${moonLightPath(shadow, 43)}" fill="#05080e" fill-opacity="0.94"/><circle r="43" fill="none" stroke="#8993a3" stroke-width="1"/>`;
}

export function moonIcon(id: MoonPhaseId): string {
  return `<svg viewBox="-44 -44 88 88" aria-hidden="true">${moonArt(id)}</svg>`;
}

/** Reuse the bundled, credited NASA Earth texture; all artwork remains offline. */
export function earthArt(): string {
  const texture = `${import.meta.env.BASE_URL}assets/games/earth-moon-explorer/earth-color.jpg`;
  return `<defs>
    <clipPath id="moon-puzzle-earth-clip"><circle r="143"/></clipPath>
    <radialGradient id="moon-puzzle-atmosphere"><stop offset="65%" stop-color="#8cdfff" stop-opacity="0.45"/><stop offset="100%" stop-color="#8cdfff" stop-opacity="0"/></radialGradient>
    <radialGradient id="moon-puzzle-earth-shade" cx="38%" cy="32%" r="70%"><stop offset="30%" stop-color="#fff" stop-opacity="0.08"/><stop offset="73%" stop-color="#001536" stop-opacity="0.12"/><stop offset="100%" stop-color="#001026" stop-opacity="0.85"/></radialGradient>
  </defs>
  <g transform="translate(600 450)" role="img" aria-label="Earth at the center of the Moon's cycle">
    <circle r="181" fill="url(#moon-puzzle-atmosphere)"/>
    <circle r="143" fill="#1863a2"/>
    <image href="${texture}" x="-286" y="-143" width="572" height="286" clip-path="url(#moon-puzzle-earth-clip)"/>
    <circle r="143" fill="url(#moon-puzzle-earth-shade)" stroke="#b8e7ff" stroke-width="3"/>
    <text y="189" class="moon-earth-label">Earth</text>
  </g>`;
}
