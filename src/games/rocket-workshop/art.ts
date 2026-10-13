import { PLANET_SPRITES } from '../../data/planetSprites';
import { getPart, type RocketBuild } from './rules';

const rect = (x: number, y: number, width: number, height: number, color: string): string =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}"/>`;

const outline = '#14243d';
const cream = '#f7efd8';
const shadow = '#b7c6d6';
const coral = '#fa876f';
const teal = '#79ded2';

/** Project-owned modular pixel graphics. The same pieces appear in the workshop and flight. */
export const rocketArt = (build: RocketBuild): string => {
  const nose = getPart(build, 'nose').id;
  const cabin = getPart(build, 'cabin').id;
  const fins = getPart(build, 'fins').id;
  const engine = getPart(build, 'engine').id;
  const width = cabin === 'little' ? 44 : cabin === 'cargo' ? 76 : 60;
  const pieces: string[] = [];
  const block = (x: number, y: number, w: number, h: number, color: string): void => {
    pieces.push(rect(x - 4, y - 4, w + 8, h + 8, outline), rect(x, y, w, h, color));
  };

  if (fins === 'wide') {
    block(-76, 22, 40, 58, teal);
    block(36, 22, 40, 58, teal);
    pieces.push(rect(-68, 30, 12, 42, '#c7fff0'), rect(56, 30, 12, 42, '#c7fff0'));
  } else if (fins === 'swept') {
    block(-62, 38, 30, 42, coral);
    block(32, 38, 30, 42, coral);
    pieces.push(rect(-54, 18, 14, 24, coral), rect(40, 18, 14, 24, coral));
  } else {
    block(-46, 52, 18, 24, '#edc971');
    block(28, 52, 18, 24, '#edc971');
  }

  block(-width / 2, -48, width, 110, cream);
  pieces.push(rect(width / 2 - 12, -48, 12, 110, shadow));
  pieces.push(rect(-width / 2 + 6, -40, 8, 84, '#ffffff'));
  block(-width / 2, 42, width, 14, coral);

  if (cabin === 'cargo') {
    block(-24, -28, 48, 36, '#7ed6f1');
    pieces.push(rect(-2, -28, 4, 36, outline), rect(-24, -12, 48, 4, outline));
    pieces.push(rect(-24, 20, 48, 8, '#9eacbd'));
  } else {
    block(-16, -30, 32, 32, '#65c9eb');
    pieces.push(rect(-12, -26, 12, 8, '#d5f7ff'), rect(4, -6, 8, 4, '#399abd'));
    pieces.push(rect(-10, 16, 20, 8, '#e3b757'));
  }

  if (nose === 'pointed') {
    block(-width / 2, -64, width, 16, coral);
    block(-18, -80, 36, 16, coral);
    block(-10, -96, 20, 16, coral);
    pieces.push(rect(-6, -92, 8, 20, '#ffb7a1'));
  } else if (nose === 'round') {
    block(-width / 2, -68, width, 20, teal);
    block(-width / 2 + 8, -84, width - 16, 16, teal);
    pieces.push(rect(-width / 2 + 12, -80, 12, 24, '#c7fff0'));
  } else {
    block(-width / 2, -60, width, 12, '#edc971');
    block(-4, -88, 8, 28, '#9eacbd');
    block(-30, -100, 60, 12, '#8db5e8');
    pieces.push(rect(-22, -88, 44, 8, '#8db5e8'), rect(-4, -112, 8, 12, coral));
  }

  if (engine === 'twin') {
    block(-26, 64, 20, 20, '#9eacbd');
    block(6, 64, 20, 20, '#9eacbd');
  } else if (engine === 'ion') {
    block(-22, 64, 44, 20, '#73b2e7');
    pieces.push(rect(-14, 76, 28, 8, '#b5f2ff'));
  } else {
    block(-30, 64, 60, 24, '#d28c62');
    pieces.push(rect(-22, 76, 44, 12, '#e5b477'));
  }
  return `<g shape-rendering="crispEdges">${pieces.join('')}</g>`;
};

export const flameArt = (build: RocketBuild): string => {
  const engine = getPart(build, 'engine').id;
  if (engine === 'ion') {
    return rect(-14, 88, 28, 30, '#79def5') + rect(-6, 88, 12, 40, '#e0fbff');
  }
  if (engine === 'twin') {
    return [-16, 16]
      .map((x) => rect(x - 8, 88, 16, 24, '#ffb66d') + rect(x - 4, 88, 8, 34, '#fff0b0'))
      .join('');
  }
  return (
    rect(-22, 92, 44, 30, '#fa876f') +
    rect(-14, 92, 28, 44, '#ffbf73') +
    rect(-6, 92, 12, 54, '#fff0b0')
  );
};

export const planetImage = (id: keyof typeof PLANET_SPRITES): string =>
  `${import.meta.env.BASE_URL}${PLANET_SPRITES[id].path}`;

export const stageArt = (
  build: RocketBuild,
  destinationId: keyof typeof PLANET_SPRITES,
  flying: boolean,
): string => {
  const stars = Array.from({ length: 38 }, (_, index) => {
    const x = (index * 131 + 43) % 590;
    const y = (index * 79 + 21) % 450;
    return rect(
      x,
      y,
      index % 5 === 0 ? 4 : 2,
      index % 5 === 0 ? 4 : 2,
      index % 3 === 0 ? '#91b3cb' : '#e8dfba',
    );
  }).join('');
  return `<svg class="rocket-stage-art" viewBox="0 0 600 540" role="img" aria-label="${flying ? 'Your rocket flying to its destination' : 'Your custom rocket on the launch pad'}">
    <defs><radialGradient id="rocket-sky"><stop stop-color="#263c59"/><stop offset="1" stop-color="#101e34"/></radialGradient></defs>
    <rect width="600" height="540" fill="url(#rocket-sky)"/>
    <circle cx="300" cy="255" r="190" fill="none" stroke="#30415b" stroke-dasharray="4 10"/>
    <circle cx="300" cy="255" r="140" fill="none" stroke="#30415b"/>
    <g data-stars>${stars}</g>
    <g data-pad ${flying ? 'visibility="hidden"' : ''}>
      ${rect(80, 440, 440, 12, '#68788e')}${rect(112, 452, 376, 16, '#34465e')}
      ${rect(235, 420, 130, 20, '#91a1b2')}
      <path d="M120 440v-160h58M480 440v-160h-58" fill="none" stroke="#435975" stroke-width="8"/>
      ${rect(112, 275, 20, 12, '#79ded2')}${rect(468, 275, 20, 12, '#79ded2')}
    </g>
    <g data-earth ${flying ? '' : 'visibility="hidden"'}><image href="${planetImage('earth')}" x="-15" y="345" width="155" height="155" style="image-rendering:pixelated"/></g>
    <g data-destination transform="translate(470 135) scale(.55)" ${flying ? '' : 'visibility="hidden"'}>
      <circle r="106" fill="none" stroke="#79ded2" stroke-opacity=".3"/>
      <image href="${planetImage(destinationId)}" x="-100" y="-90" width="200" height="180" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/>
    </g>
    <g data-ship transform="translate(300 280) scale(1.55)">
      <g data-flame visibility="hidden" shape-rendering="crispEdges">${flameArt(build)}</g>
      ${rocketArt(build)}
    </g>
  </svg>`;
};
