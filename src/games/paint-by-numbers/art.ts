export const ART_WIDTH = 1000;
export const ART_HEIGHT = 700;

export const COLORS = [
  { name: 'Red', hex: '#e95555' },
  { name: 'Orange', hex: '#f6a044' },
  { name: 'Yellow', hex: '#f5d45c' },
  { name: 'Green', hex: '#76b984' },
  { name: 'Blue', hex: '#68afe0' },
  { name: 'Purple', hex: '#a78acb' },
  { name: 'Brown', hex: '#ba8864' },
  { name: 'Gray', hex: '#a4b0bc' },
] as const;

export interface Region {
  path: string;
  color: number;
  x: number;
  y: number;
}
export interface Picture {
  id: string;
  title: string;
  category: CategoryId;
  regions: Region[];
  details: string[];
}
export const CATEGORIES = [
  { id: 'space', title: 'Space', subtitle: 'A universe of color', color: '#e9e3f5' },
  { id: 'vehicles', title: 'Vehicles', subtitle: 'Ready, set, create!', color: '#dcecf9' },
  { id: 'animals', title: 'Animals', subtitle: 'Meet your colorful friends', color: '#e3efd9' },
  { id: 'food', title: 'Food', subtitle: 'A little plate of happiness', color: '#fce7d8' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];

const ellipse = (x: number, y: number, rx: number, ry: number, color: number): Region => ({
  path: `M ${x - rx} ${y} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`,
  color,
  x,
  y,
});
const rect = (x: number, y: number, w: number, h: number, color: number): Region => ({
  path: `M ${x} ${y} h ${w} v ${h} h ${-w} Z`,
  color,
  x: x + w / 2,
  y: y + h / 2,
});
const shape = (path: string, color: number, x: number, y: number): Region => ({
  path,
  color,
  x,
  y,
});
const star = (x: number, y: number, size = 30): Region => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? size * 0.48 : size;
    return `${x + Math.cos(angle) * radius} ${y + Math.sin(angle) * radius}`;
  });
  return shape(`M ${points.join(' L ')} Z`, 3, x, y);
};
const spaceStars = (): Region[] => [
  star(120, 120, 35),
  star(835, 125, 35),
  star(850, 555, 38),
  star(150, 565, 32),
];
const picture = (
  id: string,
  title: string,
  category: CategoryId,
  regions: Region[],
  details: string[] = [],
): Picture => ({ id, title, category, regions, details });

function planet(id: string, title: string, base: number): Picture {
  const regions = [...spaceStars(), ellipse(500, 350, 220, 220, base)];
  const details: string[] = [];
  if (id === 'earth') {
    regions[4]!.x = 620;
    regions[4]!.y = 370;
    regions.push(
      shape(
        'M 375 220 L 435 180 L 510 195 L 525 255 L 480 290 L 505 335 L 455 365 L 425 310 L 365 300 Z',
        4,
        440,
        255,
      ),
      shape('M 480 390 L 555 370 L 580 425 L 540 510 L 505 535 L 495 465 Z', 4, 530, 435),
    );
  } else if (id === 'jupiter' || id === 'venus' || id === 'neptune' || id === 'uranus') {
    regions[4]!.y = 200;
    regions.push(
      shape(
        'M 292 280 Q 500 315 708 280 A 220 220 0 0 1 720 350 Q 500 390 280 350 A 220 220 0 0 1 292 280 Z',
        id === 'jupiter' ? 7 : 5,
        500,
        340,
      ),
      shape(
        'M 292 420 Q 500 450 708 420 A 220 220 0 0 1 672 487 Q 500 510 328 487 A 220 220 0 0 1 292 420 Z',
        id === 'jupiter' ? 2 : 6,
        500,
        470,
      ),
    );
    if (id === 'jupiter') regions.push(ellipse(585, 420, 55, 29, 1));
  } else if (id === 'saturn') {
    regions[4]!.y = 270;
    regions.push(
      shape(
        'M 282 365 C 55 470 220 590 570 472 C 880 368 905 220 713 282 L 716 332 C 815 310 742 385 550 433 C 370 482 180 468 285 414 Z',
        7,
        370,
        468,
      ),
    );
  } else {
    regions[4]!.x = 560;
    regions[4]!.y = 350;
    regions.push(
      ellipse(420, 260, 45, 35, id === 'mars' ? 7 : 8),
      ellipse(580, 440, 54, 45, id === 'mars' ? 2 : 7),
      ellipse(395, 420, 28, 30, id === 'mars' ? 7 : 8),
    );
  }
  return picture(id, title, 'space', regions, details);
}

function solarSystem(): Picture {
  const regions: Region[] = [ellipse(115, 345, 85, 85, 3)];
  const details: string[] = [];
  const worlds = [
    ['Mercury', 8, 260, 250, 25],
    ['Venus', 2, 350, 440, 35],
    ['Earth', 5, 445, 245, 40],
    ['Mars', 1, 525, 440, 31],
    ['Jupiter', 7, 635, 260, 66],
    ['Saturn', 3, 760, 440, 54],
    ['Uranus', 5, 855, 245, 38],
    ['Neptune', 6, 930, 425, 38],
  ] as const;
  details.push('<text x="115" y="465">Sun</text>');
  for (const [name, color, x, y, r] of worlds) {
    regions.push(ellipse(x, y, r, r, color));
    details.push(`<text x="${x}" y="${y + r + 35}">${name}</text>`);
    if (name === 'Saturn')
      details.push(`<ellipse cx="${x}" cy="${y}" rx="80" ry="16" fill="none"/>`);
  }
  regions.push(star(320, 110), star(590, 565), star(790, 100));
  return picture('solar-system', 'Solar System', 'space', regions, details);
}

function vehicle(id: string, title: string, color: number): Picture {
  const regions: Region[] = [];
  const details: string[] = ['<path d="M 100 590 H 900" fill="none"/>'];
  if (id === 'airplane') {
    regions.push(
      shape(
        'M 145 335 L 405 300 L 490 130 L 555 130 L 530 300 L 745 300 L 810 210 L 865 210 L 835 335 L 865 425 L 810 425 L 745 370 L 530 370 L 555 550 L 490 550 L 405 375 L 145 355 Q 110 345 145 335 Z',
        5,
        610,
        335,
      ),
      shape('M 405 300 L 490 130 L 555 130 L 530 300 Z', 1, 505, 240),
      shape('M 405 375 L 530 370 L 555 550 L 490 550 Z', 1, 510, 465),
    );
    for (let i = 0; i < 5; i++) regions.push(ellipse(290 + i * 85, 338, 20, 16, 8));
  } else if (id === 'motorcycle') {
    regions.push(
      ellipse(285, 490, 90, 90, 8),
      ellipse(730, 490, 90, 90, 8),
      shape(
        'M 285 490 L 405 330 L 600 330 L 730 490 L 570 490 L 475 405 L 375 490 Z',
        color,
        510,
        365,
      ),
      ellipse(285, 490, 40, 40, 3),
      ellipse(730, 490, 40, 40, 3),
      rect(395, 290, 145, 45, 7),
      shape('M 600 330 L 630 245 L 695 245 L 700 275 L 660 280 L 650 390 Z', 8, 648, 300),
      ellipse(690, 310, 35, 35, 3),
    );
  } else {
    const truck = ['fire-truck', 'ambulance', 'garbage-truck', 'school-bus'].includes(id);
    regions.push(
      shape(
        truck
          ? 'M 160 250 L 650 250 L 650 305 L 770 305 L 850 405 L 870 510 L 140 510 L 140 310 Q 140 250 160 250 Z'
          : 'M 140 405 L 285 370 L 380 260 L 650 260 L 755 380 L 860 410 L 875 510 L 130 510 Z',
        color,
        truck ? 230 : 500,
        truck ? 330 : 455,
      ),
    );
    if (id === 'school-bus') {
      for (let i = 0; i < 5; i++) regions.push(rect(180 + i * 90, 290, 68, 78, 5));
      regions.push(rect(665, 350, 80, 145, 5));
      details.push('<text x="405" y="430">SCHOOL BUS</text>');
    } else if (truck) {
      regions.push(shape('M 675 330 L 750 330 L 810 405 L 675 405 Z', 5, 728, 370));
      if (id === 'garbage-truck') {
        regions.push(rect(195, 290, 385, 175, 4));
        details.push(
          '<path d="M 295 360 L 350 315 L 405 360 M 350 315 V 415 M 295 405 H 405" fill="none"/>',
        );
      } else if (id === 'fire-truck') {
        regions.push(
          rect(175, 205, 450, 45, 8),
          rect(190, 315, 165, 115, 3),
          rect(390, 315, 200, 115, 8),
        );
        details.push(
          '<path d="M 235 207 V 248 M 305 207 V 248 M 375 207 V 248 M 445 207 V 248 M 515 207 V 248 M 585 207 V 248"/>',
        );
      } else {
        regions.push(
          rect(305, 300, 180, 145, 5),
          shape(
            'M 365 320 H 425 V 350 H 455 V 395 H 425 V 425 H 365 V 395 H 335 V 350 H 365 Z',
            1,
            395,
            372,
          ),
        );
      }
    } else {
      regions.push(
        shape('M 310 370 L 395 285 L 490 285 L 490 370 Z', 5, 427, 335),
        shape('M 515 285 L 635 285 L 720 375 L 515 375 Z', 5, 590, 335),
      );
      if (id === 'police-car') {
        regions.push(rect(445, 220, 75, 40, 1), rect(520, 220, 75, 40, 5), star(505, 445, 40));
        details.push('<text x="690" y="457">POLICE</text>');
      } else {
        regions.push(rect(145, 365, 100, 35, 6), ellipse(520, 445, 53, 37, 3));
        details.push('<text x="520" y="455">1</text>');
      }
    }
    regions.push(
      ellipse(290, 510, 75, 75, 8),
      ellipse(730, 510, 75, 75, 8),
      ellipse(290, 510, 32, 32, 6),
      ellipse(730, 510, 32, 32, 6),
      rect(810, 430, 48, 38, 3),
    );
  }
  return picture(id, title, 'vehicles', regions, details);
}

function animal(id: string, title: string): Picture {
  let regions: Region[];
  const details: string[] = [];
  if (id === 'butterfly') {
    regions = [
      ellipse(350, 280, 150, 140, 6),
      ellipse(650, 280, 150, 140, 6),
      ellipse(365, 470, 125, 115, 2),
      ellipse(635, 470, 125, 115, 2),
      ellipse(335, 270, 65, 60, 3),
      ellipse(665, 270, 65, 60, 3),
      ellipse(365, 475, 48, 45, 1),
      ellipse(635, 475, 48, 45, 1),
      ellipse(500, 375, 32, 180, 7),
    ];
    details.push('<path d="M 490 200 Q 450 100 420 140 M 510 200 Q 550 100 580 140" fill="none"/>');
  } else if (id === 'fish') {
    regions = [
      shape('M 680 350 L 850 220 L 850 480 Z', 2, 810, 350),
      shape('M 410 225 Q 480 100 580 220 L 565 270 Z', 3, 495, 215),
      ellipse(460, 350, 250, 150, 5),
      shape('M 420 203 Q 470 350 420 497 L 490 499 Q 550 350 490 201 Z', 3, 480, 350),
      ellipse(300, 310, 35, 35, 6),
      ellipse(770, 150, 30, 30, 5),
      ellipse(840, 90, 20, 20, 5),
    ];
    details.push(
      '<circle cx="300" cy="310" r="10" fill="#253849"/><path d="M 220 370 Q 260 405 295 375" fill="none"/>',
    );
  } else if (id === 'turtle') {
    regions = [
      ellipse(310, 240, 75, 58, 4),
      ellipse(310, 470, 75, 58, 4),
      ellipse(645, 245, 75, 58, 4),
      ellipse(645, 465, 75, 58, 4),
      ellipse(780, 350, 95, 80, 4),
      ellipse(480, 350, 235, 170, 7),
      shape('M 430 270 L 530 270 L 590 350 L 530 430 L 430 430 L 370 350 Z', 4, 480, 350),
    ];
    details.push(
      '<circle cx="810" cy="325" r="9" fill="#253849"/><path d="M 820 375 Q 845 385 855 365 M 430 270 L 370 200 M 530 270 L 585 200 M 590 350 H 715 M 530 430 L 585 500 M 430 430 L 370 500 M 370 350 H 245" fill="none"/>',
    );
  } else {
    const isCat = id === 'cat';
    const isLion = id === 'lion';
    const base = isCat ? 8 : isLion ? 3 : 7;
    regions = [
      ellipse(500, 470, 150, 145, base),
      ellipse(380, 575, 75, 40, base),
      ellipse(620, 575, 75, 40, base),
    ];
    if (isLion) regions.push(ellipse(500, 290, 210, 195, 2));
    regions.push(
      isCat
        ? shape('M 345 275 L 335 110 L 455 205 Z', base, 370, 200)
        : ellipse(350, 250, 70, 110, base),
      isCat
        ? shape('M 545 205 L 665 110 L 655 275 Z', base, 630, 200)
        : ellipse(650, 250, 70, 110, base),
      ellipse(500, 285, 150, 125, base),
      ellipse(500, 495, 85, 80, 3),
      ellipse(500, 330, 75, 47, 2),
      shape('M 475 310 Q 500 290 525 310 L 500 335 Z', 1, 500, 314),
    );
    details.push(
      '<circle cx="445" cy="270" r="10" fill="#253849"/><circle cx="555" cy="270" r="10" fill="#253849"/><path d="M 500 335 Q 470 370 450 345 M 500 335 Q 530 370 550 345" fill="none"/>',
    );
    if (isCat)
      details.push(
        '<path d="M 425 320 L 330 305 M 425 340 L 330 355 M 575 320 L 670 305 M 575 340 L 670 355" fill="none"/>',
      );
  }
  return picture(id, title, 'animals', regions, details);
}

function food(id: string, title: string): Picture {
  const regions: Region[] = [ellipse(500, 375, 385, 235, 5), ellipse(500, 370, 340, 195, 8)];
  const details: string[] = [];
  if (id === 'pizza') {
    regions.push(ellipse(500, 355, 275, 180, 7), ellipse(500, 355, 245, 150, 3));
    for (const [x, y] of [
      [380, 310],
      [540, 270],
      [640, 370],
      [460, 430],
      [350, 400],
      [580, 440],
    ])
      regions.push(ellipse(x!, y!, 32, 26, 1));
    details.push(
      '<path d="M 500 355 L 500 205 M 500 355 L 700 270 M 500 355 L 720 420 M 500 355 L 500 505 M 500 355 L 280 420 M 500 355 L 300 270" fill="none"/>',
    );
  } else if (id === 'pasta') {
    regions.push(ellipse(500, 375, 265, 140, 1));
    for (let i = 0; i < 8; i++) {
      const x = 305 + (i % 4) * 110;
      const y = 305 + Math.floor(i / 4) * 110;
      regions.push(
        shape(
          `M ${x} ${y} q 55 -45 80 10 q 15 45 -35 50 l -15 -28 q 30 -3 12 -15 q -15 -10 -27 9 Z`,
          3,
          x + 30,
          y + 8,
        ),
      );
    }
    regions.push(ellipse(535, 230, 45, 24, 4));
  } else if (id === 'tenders-mac') {
    for (let i = 0; i < 3; i++)
      regions.push(ellipse(340 + i * 15, 275 + i * 92, 115, 35, i % 2 ? 7 : 2));
    for (let i = 0; i < 9; i++) {
      const x = 525 + (i % 3) * 70;
      const y = 290 + Math.floor(i / 3) * 70;
      regions.push(shape(`M ${x} ${y} q 45 -35 58 8 l -22 15 q -8 -22 -28 0 Z`, 3, x + 29, y + 3));
    }
  } else if (id === 'breakfast') {
    regions.push(
      ellipse(370, 380, 145, 95, 7),
      ellipse(370, 350, 145, 95, 2),
      ellipse(370, 320, 145, 95, 3),
      rect(335, 295, 65, 45, 2),
      ellipse(635, 295, 95, 75, 3),
      ellipse(635, 295, 42, 37, 2),
      shape(
        'M 545 400 Q 580 360 600 400 T 650 400 L 670 460 Q 635 500 610 460 T 565 460 Z',
        1,
        610,
        430,
      ),
      shape('M 795 170 H 910 L 895 335 H 810 Z', 2, 852, 245),
    );
    details.push('<path d="M 850 175 L 870 110 H 910" fill="none"/>');
  } else {
    regions.push(
      shape('M 255 340 L 490 200 L 680 355 L 440 490 Z', 7, 460, 250),
      shape('M 250 365 L 490 225 L 680 380 L 440 515 Z', 4, 450, 475),
      shape('M 245 395 L 480 255 L 675 405 L 435 545 Z', 3, 460, 515),
      shape('M 240 370 L 475 230 L 670 385 L 430 520 Z', 2, 455, 365),
    );
    for (let i = 0; i < 4; i++)
      regions.push(ellipse(735 + (i % 2) * 55, 295 + Math.floor(i / 2) * 105, 35, 48, 3));
  }
  return picture(id, title, 'food', regions, details);
}

export const PICTURES: readonly Picture[] = [
  solarSystem(),
  ...(
    [
      ['mercury', 'Mercury', 8],
      ['venus', 'Venus', 2],
      ['earth', 'Earth', 5],
      ['mars', 'Mars', 1],
      ['jupiter', 'Jupiter', 3],
      ['saturn', 'Saturn', 3],
      ['uranus', 'Uranus', 5],
      ['neptune', 'Neptune', 5],
    ] as const
  ).map(([id, title, color]) => planet(id, title, color)),
  ...(
    [
      ['police-car', 'Police Car', 5],
      ['ambulance', 'Ambulance', 8],
      ['fire-truck', 'Fire Truck', 1],
      ['school-bus', 'School Bus', 3],
      ['garbage-truck', 'Garbage Truck', 4],
      ['race-car', 'Race Car', 1],
      ['airplane', 'Airplane', 5],
      ['motorcycle', 'Motorcycle', 1],
    ] as const
  ).map(([id, title, color]) => vehicle(id, title, color)),
  ...(
    [
      ['cat', 'Cat'],
      ['dog', 'Dog'],
      ['lion', 'Lion'],
      ['butterfly', 'Butterfly'],
      ['turtle', 'Turtle'],
      ['fish', 'Fish'],
    ] as const
  ).map(([id, title]) => animal(id, title)),
  ...(
    [
      ['pizza', 'Pizza'],
      ['pasta', 'Pasta'],
      ['tenders-mac', 'Chicken Tenders & Mac ’n’ Cheese'],
      ['breakfast', 'Breakfast'],
      ['sandwich-chips', 'Sandwich & Chips'],
    ] as const
  ).map(([id, title]) => food(id, title)),
];

/** The same original vector geometry supplies the gallery and playable outlines. */
export function thumbnail(p: Picture): string {
  return `<svg viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}" aria-hidden="true" focusable="false"><g stroke="#344757" stroke-width="5" stroke-linejoin="round">${p.regions.map((r) => `<path d="${r.path}" fill="${COLORS[r.color - 1]!.hex}"/>`).join('')}</g><g stroke="#344757" stroke-width="5" fill="#344757" font-family="Arial" font-size="22" text-anchor="middle">${p.details.join('')}</g></svg>`;
}
