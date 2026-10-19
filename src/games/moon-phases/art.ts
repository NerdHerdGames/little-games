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

export function moonArt(id: MoonPhaseId): string {
  return `<circle r="43" fill="#253754" stroke="#b9c8e4" stroke-width="2"/><path d="${moonLightPath(id)}" fill="#ffe8ae"/>`;
}

export function moonIcon(id: MoonPhaseId): string {
  return `<svg viewBox="-54 -54 108 108" aria-hidden="true">${moonArt(id)}</svg>`;
}
