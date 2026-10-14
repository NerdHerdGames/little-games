import { CanvasTexture, SRGBColorSpace } from 'three';
import type { MoonData, MoonSystem } from './systems';

export const moonColor = (moon: MoonData): string =>
  ({
    io: '#e7cc78',
    europa: '#e3d1ae',
    ganymede: '#adaba5',
    callisto: '#8f8880',
    titan: '#dbac61',
    triton: '#d3c9bb',
    charon: '#a8a9ad',
    'mk-2': '#716b66',
  })[moon.id] ?? '#bdb7ae';

/** Project-owned illustrative surfaces; never present these as spacecraft photographs. */
export const illustratedSurface = (system?: MoonSystem): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Surface drawing is unavailable.');
  let seed =
    [...(system?.id ?? 'moon')].reduce((value, char) => value * 31 + char.charCodeAt(0), 1) >>> 0;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const banded = system && ['jupiter', 'saturn', 'uranus', 'neptune'].includes(system.id);
  const base = system ? `#${system.color.toString(16).padStart(6, '0')}` : '#d4d0c9';
  context.fillStyle = base;
  context.fillRect(0, 0, 512, 256);
  if (banded) {
    for (let index = 0; index < 56; index += 1) {
      context.fillStyle = index % 2 ? '#fff7e5' : '#482c2b';
      context.globalAlpha = random() * (system.id === 'uranus' ? 0.07 : 0.22);
      context.fillRect(0, (index / 56) * 256, 512, 3 + random() * 6);
    }
    if (system.id === 'jupiter') {
      context.globalAlpha = 0.8;
      context.fillStyle = '#ad634a';
      context.beginPath();
      context.ellipse(330, 155, 31, 12, 0, 0, Math.PI * 2);
      context.fill();
    }
  } else {
    for (let index = 0; index < 450; index += 1) {
      const x = random() * 512,
        y = random() * 256,
        radius = 1 + random() * 12;
      context.globalAlpha = 0.05 + random() * 0.1;
      context.strokeStyle = '#332c2a';
      context.fillStyle = '#fff5dd';
      context.lineWidth = 1.5;
      for (const offset of [-512, 0, 512]) {
        context.beginPath();
        context.ellipse(x + offset, y, radius, radius * 0.7, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }
    if (system?.id === 'pluto') {
      context.globalAlpha = 0.8;
      context.fillStyle = '#f6e6d3';
      context.beginPath();
      context.moveTo(270, 180);
      context.bezierCurveTo(210, 145, 210, 95, 270, 125);
      context.bezierCurveTo(325, 85, 335, 140, 270, 180);
      context.fill();
    }
  }
  context.globalAlpha = 1;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};
