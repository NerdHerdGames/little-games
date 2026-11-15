import { createPiece } from './registry';
import { findSnap } from './connections';
import { defaultDocument, type Piece, type RunDocument } from './types';
export const EXAMPLES = [
  { id: 'first', name: 'Rainbow road', icon: '〰', description: 'A gentle first run' },
  { id: 'race', name: 'Ready, set, roll!', icon: '⚑', description: 'Two starts, one finish' },
  { id: 'music', name: 'Little melody', icon: '♫', description: 'A staircase of musical notes' },
  { id: 'sorting', name: 'Color baskets', icon: '◈', description: 'Match symbols and colors' },
  {
    id: 'chain',
    name: 'Bounce & tumble',
    icon: '✳',
    description: 'Dominoes, a switch and a spring',
  },
] as const;
export function example(id: string): RunDocument {
  const doc = defaultDocument();
  const add = (type: string, x: number, y: number, angle = 0): Piece => {
    const p = createPiece(type, x, y);
    p.angle = angle;
    doc.pieces.push(p);
    return p;
  };
  if (id === 'race') {
    doc.experience = 'race';
    add('dispenser', 120, 110);
    add('dispenser', 120, 280).props.color = '#408cdd';
    add('long', 250, 180);
    add('long', 520, 250);
    add('long', 250, 350);
    add('long', 520, 420);
    add('finish', 720, 380).scale = 2.5;
    add('collector', 760, 550).scale = 2;
  } else if (id === 'music') {
    doc.experience = 'music';
    add('dispenser', 125, 80);
    for (let i = 0; i < 6; i++) {
      const p = add('xylophone', 170 + i * 105, 170 + i * 65, 0.25);
      p.props.note = i;
    }
    add('collector', 800, 610);
  } else if (id === 'sorting') {
    doc.experience = 'sorting';
    ['#ee6470', '#408cdd', '#3aa67b'].forEach((color, i) => {
      add('dispenser', 200 + i * 280, 90).props.color = color;
      add('funnel', 200 + i * 280, 190);
      add('collector', 200 + i * 280, 400).props.color = color;
    });
  } else if (id === 'chain') {
    doc.experience = 'chain';
    add('dispenser', 100, 150);
    add('long', 190, 240);
    add('platform', 470, 320);
    for (let i = 0; i < 5; i++) add('domino', 390 + i * 35, 275);
    add('plate', 670, 375);
    add('gate', 780, 410);
    add('trampoline', 710, 520);
    add('bell', 870, 390);
    add('collector', 900, 590);
  } else {
    add('dispenser', 135, 80);
    const first = add('ramp', 210, 180);
    let previous = first;
    for (let i = 0; i < 2; i++) {
      const p = createPiece('ramp', previous.x + 180, previous.y + 48);
      const snap = findSnap(p, [previous], [], 15);
      if (snap) {
        doc.pieces.push(snap.piece);
        doc.connections.push(snap.connection);
        previous = snap.piece;
      }
    }
    add('bell', 740, 365, 0.12);
    add('funnel', 760, 470);
    add('collector', 760, 610);
    add('bumper', 350, 480);
  }
  return doc;
}
