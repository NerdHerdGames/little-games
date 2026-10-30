import { PLANETS, type PlanetData } from '../../data/planets';

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
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#222222' },
  { name: 'Cream', hex: '#f2ddb6' },
  { name: 'Golden brown', hex: '#ca8a42' },
  { name: 'Dark gray', hex: '#737d87' },
  { name: 'Rust', hex: '#c67c5a' },
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
  width: number;
  height: number;
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
  star(65, 105, 35),
  star(935, 105, 35),
  star(935, 645, 38),
  star(65, 645, 32),
];
const picture = (
  id: string,
  title: string,
  category: CategoryId,
  regions: Region[],
  details: string[] = [],
  size = { width: ART_WIDTH, height: ART_HEIGHT },
): Picture => ({ id, title, category, regions, details, ...size });

function planet(id: string, title: string, base: number): Picture {
  const radius = id === 'saturn' ? 320 : 335;
  const regions = [...spaceStars(), ellipse(500, 350, radius, radius, base)];
  const details: string[] = [];
  if (id === 'earth') {
    regions[4]!.x = 682.7;
    regions[4]!.y = 380.5;
    regions.push(
      shape(
        'M 309.7 152 L 401 91.1 L 515.2 114 L 538.1 205.3 L 469.5 258.6 L 507.6 327.2 L 431.5 372.8 L 385.8 289.1 L 294.4 273.9 Z',
        4,
        408.6,
        205.3,
      ),
      shape(
        'M 469.5 410.9 L 583.8 380.5 L 621.8 464.2 L 560.9 593.6 L 507.6 631.7 L 492.4 525.1 Z',
        4,
        545.7,
        479.4,
      ),
    );
  } else if (id === 'jupiter' || id === 'venus' || id === 'neptune' || id === 'uranus') {
    regions[4]!.y = 121.6;
    regions.push(
      shape(
        'M 183.3 243.4 Q 500 296.7 816.7 243.4 A 335 335 0 0 1 835 350 Q 500 410.9 165 350 A 335 335 0 0 1 183.3 243.4 Z',
        id === 'jupiter' ? 7 : 5,
        500,
        334.8,
      ),
      shape(
        'M 183.3 456.6 Q 500 502.3 816.7 456.6 A 335 335 0 0 1 761.9 558.6 Q 500 593.6 238.1 558.6 A 335 335 0 0 1 183.3 456.6 Z',
        id === 'jupiter' ? 2 : 6,
        500,
        532.7,
      ),
    );
    if (id === 'jupiter') regions.push(ellipse(629.4, 456.6, 83.8, 44.2, 1));
  } else if (id === 'saturn') {
    regions[4]!.y = 233.6;
    regions.push(
      shape(
        'M 182.9 371.8 C -147.3 524.5 92.7 699.1 601.8 527.5 C 1052.7 376.2 1089.1 160.9 809.8 251.1 L 814.2 323.8 C 958.2 291.8 852 400.9 572.7 470.7 C 310.9 542 34.5 521.6 187.3 443.1 Z',
        7,
        310.9,
        521.6,
      ),
    );
  } else {
    regions[4]!.x = 591.4;
    regions[4]!.y = 350;
    regions.push(
      ellipse(378.2, 213, 68.5, 53.3, id === 'mars' ? 7 : 8),
      ellipse(621.8, 487, 82.2, 68.5, id === 'mars' ? 2 : 7),
      ellipse(340.1, 456.6, 42.6, 45.7, id === 'mars' ? 7 : 8),
    );
  }
  return picture(id, title, 'space', regions, details);
}

function dwarfPlanet({ id, name }: PlanetData): Picture {
  const regions = spaceStars();
  if (id === 'ceres') {
    regions.push(
      ellipse(500, 350, 335, 335, 8),
      ellipse(365, 230, 100, 78, 13),
      ellipse(630, 450, 110, 90, 13),
      ellipse(330, 475, 48, 42, 13),
      ellipse(346, 222, 32, 26, 9),
      ellipse(399, 245, 20, 18, 9),
    );
    regions[4]!.x = 640;
    regions[4]!.y = 250;
    regions[5]!.y = 270;
  } else if (id === 'pluto') {
    regions.push(
      ellipse(500, 350, 335, 335, 11),
      ellipse(335, 190, 70, 40, 7),
      ellipse(590, 610, 65, 30, 7),
      shape(
        'M 500 540 C 480 515 340 420 335 340 C 326 235 453 200 500 290 C 547 200 674 235 665 340 C 660 420 520 515 500 540 Z',
        9,
        500,
        390,
      ),
    );
    regions[4]!.x = 725;
    regions[4]!.y = 350;
  } else if (id === 'haumea') {
    regions.push(
      shape(
        'M 110 385 C 5 350 110 265 420 220 C 715 175 970 210 910 285 L 885 300 C 925 246 710 218 430 260 C 180 297 95 335 138 350 Z',
        13,
        810,
        225,
      ),
      ellipse(500, 350, 365, 215, 9),
      ellipse(345, 360, 55, 40, 8),
      ellipse(630, 310, 70, 45, 8),
      shape(
        'M 130 350 C 70 400 270 445 550 400 C 810 355 930 295 870 280 L 895 250 C 1015 290 850 405 560 450 C 260 505 20 445 110 385 Z',
        13,
        500,
        438,
      ),
    );
    regions[5]!.y = 240;
  } else if (id === 'makemake') {
    regions.push(
      ellipse(500, 350, 335, 335, 14),
      shape(
        'M 315 170 Q 390 130 445 180 Q 470 230 420 270 Q 385 300 400 350 Q 410 410 345 430 Q 280 430 270 365 Q 310 320 285 275 Q 265 220 315 170 Z',
        12,
        355,
        250,
      ),
      shape(
        'M 555 430 Q 615 395 665 450 Q 700 490 655 535 Q 600 575 550 530 Q 515 480 555 430 Z',
        11,
        605,
        485,
      ),
    );
    regions[4]!.x = 600;
    regions[4]!.y = 260;
  } else {
    regions.push(
      ellipse(500, 350, 335, 335, 9),
      shape(
        'M 290 205 Q 330 145 415 170 Q 470 185 440 225 Q 400 240 370 290 Q 340 325 300 285 Q 275 250 290 205 Z',
        8,
        355,
        220,
      ),
      shape(
        'M 570 440 Q 610 395 660 435 Q 700 470 655 510 Q 625 525 600 555 Q 550 575 535 530 Q 530 485 570 440 Z',
        8,
        605,
        490,
      ),
      ellipse(390, 525, 40, 28, 8),
    );
  }
  return picture(id, name, 'space', regions);
}

function solarSystem(): Picture {
  const regions: Region[] = [ellipse(285, 330, 230, 230, 3)];
  const accents: Region[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const point = (radius: number, sideways: number): string =>
      `${(285 + cos * radius - sin * sideways).toFixed(1)} ${(330 + sin * radius + cos * sideways).toFixed(1)}`;
    accents.push(
      shape(
        `M ${point(238, -18)} C ${point(254, -30)} ${point(258, -10)} ${point(275, 0)} C ${point(259, -3)} ${point(256, 26)} ${point(238, 18)} Q ${point(246, 0)} ${point(238, -18)} Z`,
        2,
        285 + cos * 251,
        330 + sin * 251,
      ),
    );
  }
  const details: string[] = [];
  const worlds = [
    ['Mercury', 8, 575, 140, 65],
    ['Venus', 2, 640, 480, 92],
    ['Earth', 5, 795, 155, 100],
    ['Mars', 1, 845, 495, 82],
    ['Jupiter', 7, 1065, 175, 150],
    ['Saturn', 3, 1120, 505, 125],
    ['Uranus', 5, 1450, 155, 105],
    ['Neptune', 6, 1450, 490, 100],
  ] as const;
  details.push('<text x="285" y="640">Sun</text>');
  for (const [name, color, x, y, r] of worlds) {
    const body = ellipse(x, y, r, r, color);
    regions.push(body);
    details.push(`<text x="${x}" y="${y + r + 35}">${name}</text>`);
    if (name === 'Earth') {
      body.x = x + 52;
      body.y = y - 20;
      accents.push(
        shape(
          'M 755 95 Q 775 80 790 100 L 797 124 Q 781 130 783 146 L 769 163 Q 751 160 752 142 L 738 130 L 742 108 Z',
          4,
          766,
          122,
        ),
        shape('M 809 170 Q 828 166 838 184 L 829 205 L 815 235 L 806 208 L 798 190 Z', 4, 817, 191),
      );
    }
    if (name === 'Jupiter') accents.push(ellipse(x + 55, y + 55, 55, 32, 1));
    if (name === 'Saturn')
      details.push(`<ellipse cx="${x}" cy="${y}" rx="180" ry="36" fill="none"/>`);
  }
  regions.push(...accents);
  return picture('solar-system', 'Solar System', 'space', regions, details, {
    width: 1600,
    height: ART_HEIGHT,
  });
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
      ellipse(270, 490, 95, 95, 10),
      ellipse(760, 490, 95, 95, 10),
      shape(
        'M 345 320 H 455 L 475 350 H 580 L 640 290 L 665 310 L 625 382 L 535 475 H 330 L 340 443 H 518 L 562 382 H 350 L 320 415 L 295 400 Z',
        8,
        376,
        460,
      ),
      shape('M 638 260 L 674 248 L 787 480 L 753 500 Z', 8, 705, 360),
      shape(
        'M 530 445 H 560 L 602 500 Q 620 515 600 532 H 335 Q 315 532 315 515 Q 315 498 335 498 H 568 Z',
        8,
        460,
        515,
      ),
      shape('M 440 375 H 535 L 570 410 L 550 465 H 430 L 405 430 Z', 8, 510, 425),
      shape(
        'M 460 300 Q 505 260 568 280 L 613 305 Q 631 335 608 355 H 474 Q 452 337 460 300 Z',
        color,
        540,
        315,
      ),
      shape(
        'M 355 285 H 470 Q 485 285 485 300 V 320 H 345 V 300 Q 345 285 355 285 Z',
        10,
        415,
        302,
      ),
      shape('M 600 216 H 677 L 714 270 L 689 286 L 661 252 H 600 Z', 10, 637, 234),
      shape('M 166 435 Q 250 350 338 394 L 358 414 L 339 438 Q 269 395 193 462 Z', color, 260, 405),
      shape('M 655 436 Q 749 355 841 420 L 860 447 L 835 462 Q 758 410 681 465 Z', color, 760, 419),
      ellipse(699, 292, 37, 37, 3),
      ellipse(270, 490, 50, 50, 8),
      ellipse(760, 490, 50, 50, 8),
    );
    details.push(
      '<path d="M 425 402 H 465 M 420 420 H 460 M 430 438 H 465 M 270 445 V 467 M 270 513 V 535 M 225 490 H 247 M 293 490 H 315 M 760 445 V 467 M 760 513 V 535 M 715 490 H 737 M 783 490 H 805" fill="none"/>',
    );
  } else if (id === 'garbage-truck') {
    regions.push(
      rect(130, 470, 760, 55, 8),
      shape(
        'M 180 210 H 580 Q 630 210 650 260 V 475 H 170 L 140 450 V 260 Q 140 210 180 210 Z',
        color,
        535,
        350,
      ),
      shape('M 665 300 H 795 L 870 390 L 890 510 H 665 Z', color, 805, 410),
      shape('M 140 265 L 205 285 V 425 L 165 490 H 105 L 120 420 V 315 Z', 8, 160, 365),
      shape('M 690 325 H 780 L 835 390 H 690 Z', 5, 745, 355),
      ellipse(740, 280, 30, 25, 3),
      rect(842, 405, 30, 32, 3),
      ellipse(265, 520, 65, 65, 10),
      ellipse(415, 520, 65, 65, 10),
      ellipse(790, 510, 75, 75, 10),
      ellipse(265, 520, 30, 30, 8),
      ellipse(415, 520, 30, 30, 8),
      ellipse(790, 510, 35, 35, 8),
    );
    regions[0]!.x = 600;
    regions[0]!.y = 500;
    details.push(
      '<path d="M 225 235 V 435 M 590 240 V 440 M 680 310 V 475 H 712 M 690 420 H 715" fill="none"/>',
      ...[0, 120, 240].map(
        (angle) =>
          `<path d="M 391 313 L 413 350 L 403 356 L 442 380 L 441 334 L 431 340 L 409 303 Z" transform="rotate(${angle} 385 350)" fill="#ffffff"/>`,
      ),
    );
  } else if (id === 'fire-truck') {
    regions.push(
      rect(125, 475, 770, 45, 8),
      rect(200, 235, 30, 25, 8),
      rect(545, 235, 30, 25, 8),
      shape('M 145 255 H 600 V 505 H 130 V 275 Q 130 255 145 255 Z', color, 555, 280),
      shape('M 615 235 H 805 L 865 305 L 885 405 V 505 H 615 Z', color, 700, 380),
      rect(650, 205, 50, 30, 1),
      rect(700, 205, 50, 30, 5),
      rect(160, 175, 460, 65, 8),
      rect(135, 425, 745, 30, 9),
      rect(170, 290, 150, 120, 8),
      rect(345, 290, 150, 120, 8),
      ellipse(550, 355, 40, 48, 13),
      ellipse(550, 355, 22, 28, 8),
      rect(640, 265, 70, 75, 5),
      shape('M 735 265 H 790 L 837 320 L 840 340 H 735 Z', 5, 777, 305),
      rect(850, 375, 28, 40, 3),
      rect(865, 475, 45, 40, 8),
      rect(625, 475, 65, 30, 8),
      ellipse(270, 510, 80, 80, 10),
      ellipse(775, 510, 80, 80, 10),
      ellipse(270, 510, 38, 38, 8),
      ellipse(775, 510, 38, 38, 8),
    );
    regions[0]!.x = 500;
    regions[0]!.y = 512;
    regions[7]!.x = 600;
    regions[7]!.y = 208;
    regions[11]!.x = 550;
    regions[11]!.y = 319;
    for (let i = 0; i < 6; i++) regions.push(rect(175 + i * 72, 190, 55, 35, 9));
    details.push(
      '<path d="M 180 315 H 310 M 180 335 H 310 M 180 355 H 310 M 180 375 H 310 M 355 315 H 485 M 355 335 H 485 M 355 355 H 485 M 355 375 H 485 M 225 395 H 265 M 400 395 H 440 M 625 250 V 410 M 725 250 V 410 M 650 365 H 680 M 850 435 V 465 M 860 435 V 465" fill="none"/>',
      '<text x="665" y="448">FIRE</text>',
    );
  } else {
    const truck = ['ambulance', 'school-bus'].includes(id);
    regions.push(
      shape(
        id === 'school-bus'
          ? 'M 160 250 L 870 250 Q 900 250 900 280 L 900 510 L 140 510 L 140 280 Q 140 250 160 250 Z'
          : truck
            ? 'M 160 250 L 650 250 L 650 305 L 770 305 L 850 405 L 870 510 L 140 510 L 140 310 Q 140 250 160 250 Z'
            : 'M 140 405 L 285 370 L 380 260 L 650 260 L 755 380 L 860 410 L 875 510 L 130 510 Z',
        color,
        id === 'school-bus' ? 520 : truck ? 230 : 500,
        id === 'school-bus' ? 475 : truck ? 330 : 455,
      ),
    );
    if (id === 'school-bus') {
      for (let i = 0; i < 5; i++) regions.push(rect(180 + i * 90, 290, 68, 78, 5));
      regions.push(rect(640, 290, 80, 205, 5), rect(755, 290, 90, 90, 5));
      details.push('<text x="405" y="430">SCHOOL BUS</text>');
    } else if (truck) {
      regions.push(shape('M 675 330 L 750 330 L 810 405 L 675 405 Z', 5, 728, 370));
      regions.push(
        rect(305, 300, 180, 145, 5),
        shape(
          'M 365 320 H 425 V 350 H 455 V 395 H 425 V 425 H 365 V 395 H 335 V 350 H 365 Z',
          1,
          395,
          372,
        ),
      );
    } else {
      if (id === 'police-car') {
        regions[0]!.x = 780;
        regions[0]!.y = 410;
        regions.push(shape('M 355 390 H 675 V 510 H 355 Z', 9, 420, 455));
      }
      regions.push(
        shape('M 310 370 L 395 285 L 490 285 L 490 370 Z', 5, 427, 335),
        shape('M 515 285 L 635 285 L 720 375 L 515 375 Z', 5, 590, 335),
      );
      if (id === 'police-car') {
        regions.push(rect(445, 220, 75, 40, 1), rect(520, 220, 75, 40, 5), star(505, 445, 40));
        details.push('<text x="610" y="457">POLICE</text>');
      } else {
        regions.push(rect(145, 365, 100, 35, 6), ellipse(520, 445, 53, 37, 3));
        details.push('<text x="520" y="455">1</text>');
      }
    }
    regions.push(
      ellipse(290, 510, 75, 75, 8),
      ellipse(id === 'school-bus' ? 810 : 730, 510, 75, 75, 8),
      ellipse(290, 510, 32, 32, 6),
      ellipse(id === 'school-bus' ? 810 : 730, 510, 32, 32, 6),
      id === 'school-bus' ? rect(842, 388, 40, 38, 3) : rect(810, 430, 48, 38, 3),
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
  } else if (id === 'dog') {
    regions = [
      shape(
        'M 295 335 Q 225 320 192 250 Q 170 210 145 205 Q 170 290 210 355 L 272 395 Z',
        7,
        225,
        326,
      ),
      shape(
        'M 315 410 L 380 430 L 365 505 L 397 557 H 425 Q 443 557 443 580 H 366 L 327 514 Z',
        7,
        353,
        495,
      ),
      shape('M 575 420 H 620 L 630 554 H 662 Q 680 554 680 580 H 601 L 585 500 Z', 7, 610, 520),
      shape(
        'M 300 310 Q 390 278 510 310 L 610 315 Q 655 325 665 378 L 670 441 Q 570 470 430 450 L 335 455 Q 270 450 262 400 Q 249 343 300 310 Z',
        9,
        485,
        390,
      ),
      shape(
        'M 285 402 L 345 425 L 320 505 L 315 557 H 350 Q 370 557 370 585 H 263 L 270 492 Z',
        9,
        291,
        532,
      ),
      shape('M 625 400 H 680 L 684 559 H 718 Q 738 559 738 585 H 640 Z', 9, 660, 524),
      shape(
        'M 302 320 Q 345 300 385 321 Q 409 352 384 388 Q 350 415 294 391 Q 275 355 302 320 Z',
        7,
        345,
        355,
      ),
      shape(
        'M 600 345 L 620 260 Q 623 205 668 195 Q 710 184 742 216 L 768 250 L 834 268 Q 860 275 850 303 Q 840 330 795 328 L 739 325 L 706 386 L 657 399 Z',
        7,
        723,
        282,
      ),
      shape('M 615 320 L 713 352 L 702 379 L 604 349 Z', 1, 658, 350),
      shape(
        'M 658 214 Q 616 214 615 258 L 628 336 Q 643 367 665 342 L 694 258 Q 694 224 658 214 Z',
        7,
        645,
        285,
      ),
      shape(
        'M 765 252 Q 792 262 829 268 L 842 278 L 833 306 Q 807 320 770 309 L 746 293 Z',
        9,
        800,
        290,
      ),
    ];
    details.push(
      '<circle cx="738" cy="244" r="8" fill="#222222"/><ellipse cx="840" cy="279" rx="16" ry="12" fill="#222222"/><path d="M 840 299 Q 819 318 787 309 M 285 572 V 582 M 306 572 V 582 M 665 572 V 582 M 687 572 V 582 M 160 595 H 870" fill="none"/>',
    );
  } else if (id === 'lion') {
    regions = [
      shape(
        'M 285 344 Q 182 351 173 279 Q 170 227 135 214 L 148 188 Q 205 211 207 269 Q 216 309 288 308 Z',
        3,
        192,
        277,
      ),
      shape('M 143 205 Q 107 216 92 190 Q 82 162 121 143 Q 154 153 159 180 Z', 7, 125, 178),
      shape(
        'M 325 410 L 380 423 L 356 498 L 390 555 H 420 Q 440 555 440 580 H 365 L 318 511 Z',
        2,
        345,
        495,
      ),
      shape('M 580 397 H 630 L 637 557 H 663 Q 685 557 685 581 H 600 Z', 2, 615, 520),
      shape(
        'M 300 300 Q 410 270 535 296 L 615 320 Q 660 350 650 410 L 616 445 H 370 Q 295 465 270 417 Q 245 365 300 300 Z',
        3,
        460,
        370,
      ),
      shape(
        'M 275 398 Q 320 392 350 425 L 317 507 L 318 558 H 354 Q 374 558 374 585 H 268 L 265 500 Z',
        3,
        290,
        530,
      ),
      shape('M 632 390 H 686 L 691 558 H 730 Q 751 558 751 585 H 644 Z', 3, 665, 525),
      shape(
        'M 565 240 L 568 208 L 598 199 L 615 165 L 646 180 L 677 163 L 700 185 L 734 184 L 743 211 L 770 230 L 760 263 L 776 290 L 760 319 L 768 350 L 744 372 L 733 409 L 701 415 L 676 444 L 644 431 L 612 442 L 591 416 L 563 400 L 564 367 L 541 343 L 553 312 L 540 280 Z',
        7,
        592,
        315,
      ),
      shape(
        'M 651 213 Q 696 192 722 220 L 748 255 L 795 270 Q 822 278 818 304 Q 814 329 783 330 H 754 L 736 365 Q 711 384 680 365 L 644 326 Q 624 283 636 243 Z',
        3,
        711,
        306,
      ),
      ellipse(663, 213, 35, 38, 3),
      shape(
        'M 755 271 Q 778 263 795 274 L 808 286 L 799 308 Q 778 322 755 309 L 742 292 Z',
        9,
        777,
        291,
      ),
    ];
    details.push(
      '<circle cx="730" cy="250" r="8" fill="#222222"/><ellipse cx="812" cy="282" rx="16" ry="13" fill="#222222"/><path d="M 649 194 Q 663 182 677 194 M 812 303 Q 797 321 770 312 M 754 302 L 728 294 M 754 313 L 731 321 M 290 572 V 582 M 312 572 V 582 M 666 572 V 582 M 689 572 V 582 M 160 595 H 870" fill="none"/>',
    );
  } else {
    const base = 8;
    regions = [
      ellipse(500, 470, 150, 145, base),
      ellipse(380, 575, 75, 40, base),
      ellipse(620, 575, 75, 40, base),
    ];
    regions.push(
      shape('M 345 275 L 335 110 L 455 205 Z', base, 370, 200),
      shape('M 545 205 L 665 110 L 655 275 Z', base, 630, 200),
      ellipse(500, 285, 150, 125, base),
      ellipse(500, 495, 85, 80, 3),
      ellipse(500, 330, 75, 47, 2),
      shape('M 475 310 Q 500 290 525 310 L 500 335 Z', 1, 500, 314),
    );
    details.push(
      '<circle cx="445" cy="270" r="10" fill="#253849"/><circle cx="555" cy="270" r="10" fill="#253849"/><path d="M 500 335 Q 470 370 450 345 M 500 335 Q 530 370 550 345" fill="none"/>',
    );
    details.push(
      '<path d="M 425 320 L 330 305 M 425 340 L 330 355 M 575 320 L 670 305 M 575 340 L 670 355" fill="none"/>',
    );
  }
  return picture(id, title, 'animals', regions, details);
}

function food(id: string, title: string): Picture {
  const regions: Region[] = [
    { ...ellipse(500, 375, 385, 235, 5), y: 590 },
    { ...ellipse(500, 375, 340, 195, 9), y: 550 },
  ];
  const details: string[] = [];
  if (id === 'pizza') {
    regions.push(
      { ...ellipse(500, 375, 285, 180, 12), y: 535 },
      { ...ellipse(500, 350, 255, 145, 3), x: 425 },
    );
    for (const [x, y] of [
      [420, 275],
      [570, 275],
      [330, 330],
      [665, 335],
      [380, 355],
      [620, 425],
    ] as const) {
      regions.push(ellipse(x, y, 38, 27, 1));
      details.push(
        `<path d="M ${x - 22} ${y - 13} Q ${x - 10} ${y - 21} ${x + 4} ${y - 18}" fill="none" stroke="#8d3931" stroke-width="3"/>`,
      );
    }
    regions.push(shape('M 515 424 Q 516 380 553 385 Q 572 412 537 437 Z', 4, 541, 411));
    details.push(
      '<path d="M 500 350 L 500 205 M 500 350 L 710 278 M 500 350 L 710 422 M 500 350 L 500 495 M 500 350 L 290 422 M 500 350 L 290 278" fill="none" stroke="#b27b3b" stroke-width="3"/>',
      '<path d="M 290 448 Q 327 475 365 484 M 635 484 Q 680 472 711 443" fill="none" stroke="#8c592e" stroke-width="3"/>',
      '<circle cx="505" cy="310" r="6" fill="#394b35"/><circle cx="440" cy="420" r="6" fill="#394b35"/><circle cx="620" cy="300" r="6" fill="#394b35"/>',
    );
  } else if (id === 'pasta') {
    regions.push(
      shape(
        'M 245 315 Q 260 264 310 275 Q 345 235 395 260 Q 445 227 490 251 Q 540 234 582 255 Q 641 252 674 285 Q 718 280 743 321 Q 785 344 752 378 Q 777 417 733 435 Q 710 478 660 480 Q 620 522 560 493 Q 515 532 465 501 Q 405 520 366 490 Q 300 500 285 465 Q 235 463 241 418 Q 206 388 231 355 Z',
        1,
        500,
        496,
      ),
    );
    for (const [index, [x, y]] of (
      [
        [300, 285],
        [420, 255],
        [540, 275],
        [650, 295],
        [260, 365],
        [390, 340],
        [520, 345],
        [650, 375],
        [335, 425],
        [460, 425],
        [585, 430],
      ] as const
    ).entries()) {
      const px = (offset: number): number => x + (index % 3 === 1 ? 110 - offset : offset);
      regions.push(
        shape(
          `M ${px(0)} ${y + 35} L ${px(75)} ${y} Q ${px(110)} ${y - 4} ${px(110)} ${y + 25} L ${px(34)} ${y + 72} Q ${px(0)} ${y + 82} ${px(0)} ${y + 35} Z`,
          11,
          x + 55,
          y + 43,
        ),
      );
      details.push(
        `<ellipse cx="${px(94)}" cy="${y + 18}" rx="13" ry="9" fill="none" stroke="#9a633b" stroke-width="3"/><path d="M ${px(16)} ${y + 46} L ${px(31)} ${y + 39} M ${px(75)} ${y + 27} L ${px(92)} ${y + 19} M ${px(26)} ${y + 63} L ${px(39)} ${y + 57}" fill="none" stroke="#9a633b" stroke-width="3"/>`,
      );
    }
    regions.push(shape('M 525 245 Q 535 197 575 205 Q 588 245 541 265 Z', 4, 555, 230));
  } else if (id === 'tenders-mac') {
    regions.push(
      shape(
        'M 244 259 Q 249 244 263 250 L 274 242 L 289 250 L 304 248 L 323 261 L 340 260 L 355 273 L 376 274 L 390 285 L 411 286 Q 434 287 432 303 L 439 315 L 429 329 L 412 326 L 402 335 L 382 329 L 367 324 L 353 326 L 336 315 L 318 314 L 303 305 L 285 306 L 272 296 L 255 297 Q 235 286 244 259 Z',
        12,
        336,
        290,
      ),
      shape(
        'M 248 347 Q 274 327 309 345 L 424 373 Q 450 386 434 411 Q 417 431 388 414 L 264 392 Q 232 380 248 347 Z',
        12,
        335,
        374,
      ),
      shape(
        'M 278 433 Q 303 415 335 432 L 429 461 Q 452 482 431 502 Q 410 519 384 502 L 289 478 Q 261 465 278 433 Z',
        12,
        353,
        466,
      ),
    );
    for (const [x, y] of [
      [520, 270],
      [630, 285],
      [715, 350],
      [525, 385],
      [635, 420],
    ] as const) {
      regions.push(
        shape(
          `M ${x} ${y + 68} C ${x - 4} ${y + 20} ${x + 31} ${y - 6} ${x + 73} ${y + 12} L ${x + 61} ${y + 43} Q ${x + 31} ${y + 30} ${x + 34} ${y + 67} Z`,
          3,
          x + 23,
          y + 35,
        ),
      );
      details.push(
        `<ellipse cx="${x + 16}" cy="${y + 65}" rx="13" ry="5" fill="none" stroke="#b07b36" stroke-width="3"/><path d="M ${x + 61} ${y + 13} Q ${x + 72} ${y + 26} ${x + 61} ${y + 41}" fill="none" stroke="#b07b36" stroke-width="3"/>`,
      );
    }
    regions.push(
      shape(
        'M 455 500 Q 472 469 495 487 Q 523 476 539 502 Q 545 527 505 536 Q 474 541 455 518 Z',
        1,
        499,
        510,
      ),
    );
    details.push(
      '<path d="M 260 266 L 268 261 M 283 278 L 291 281 M 397 307 L 408 305 M 262 357 L 272 351 M 282 380 L 294 382 M 410 391 L 420 385 M 290 443 L 301 437 M 307 465 L 319 469 M 410 487 L 420 482" fill="none" stroke="#8d5c31" stroke-width="3"/>',
      '<circle cx="274" cy="274" r="4" fill="#f2ddb6" stroke="none"/><circle cx="300" cy="285" r="3" fill="#f2ddb6" stroke="none"/><circle cx="383" cy="309" r="4" fill="#f2ddb6" stroke="none"/><circle cx="276" cy="367" r="4" fill="#f2ddb6" stroke="none"/><circle cx="304" cy="380" r="3" fill="#f2ddb6" stroke="none"/><circle cx="393" cy="399" r="4" fill="#f2ddb6" stroke="none"/><circle cx="307" cy="450" r="4" fill="#f2ddb6" stroke="none"/><circle cx="323" cy="475" r="3" fill="#f2ddb6" stroke="none"/><circle cx="397" cy="486" r="4" fill="#f2ddb6" stroke="none"/>',
    );
  } else if (id === 'breakfast') {
    regions.push(
      { ...ellipse(350, 402, 145, 65, 12), y: 449 },
      { ...ellipse(350, 366, 145, 65, 12), y: 413 },
      { ...ellipse(350, 330, 145, 65, 11), y: 375 },
      shape(
        'M 280 318 Q 310 290 350 306 Q 388 288 420 311 L 432 334 Q 415 351 397 340 Q 391 369 376 353 Q 355 368 343 349 Q 315 363 302 343 Q 272 348 280 318 Z',
        7,
        305,
        325,
      ),
      rect(330, 310, 60, 42, 3),
      shape(
        'M 586 266 Q 609 239 635 255 Q 665 239 689 267 Q 724 271 724 309 Q 749 340 712 365 Q 703 399 669 387 Q 642 401 618 377 Q 579 382 577 348 Q 553 319 575 294 Z',
        9,
        600,
        350,
      ),
      ellipse(660, 315, 45, 37, 3),
      shape(
        'M 550 385 Q 571 374 588 391 L 641 465 Q 652 480 634 491 L 610 497 Q 598 495 591 479 L 548 413 Q 536 396 550 385 Z',
        1,
        590,
        438,
      ),
      shape(
        'M 650 390 Q 671 379 688 396 L 729 465 Q 741 483 722 494 L 700 502 Q 687 500 680 482 L 646 418 Q 634 401 650 390 Z',
        1,
        687,
        446,
      ),
      shape('M 800 176 H 900 L 886 363 Q 850 379 814 363 Z', 9, 850, 203),
      shape('M 812 216 H 888 L 877 350 Q 850 359 823 350 Z', 2, 850, 280),
    );
    details.push(
      '<path d="M 555 397 Q 566 393 575 407 L 579 416 M 587 394 L 612 429 M 600 461 L 615 483 M 655 402 Q 665 398 676 415 L 683 427 M 686 399 L 707 433 M 696 469 L 712 491" fill="none" stroke="#f2ddb6" stroke-width="5"/>',
      '<path d="M 880 216 L 898 145 H 934" fill="none" stroke="#64858a" stroke-width="6"/><ellipse cx="850" cy="176" rx="50" ry="8" fill="none" stroke="#64858a" stroke-width="3"/>',
    );
  } else {
    const bread = (offset: number): string =>
      `M 255 ${300 + offset} L 605 ${205 + offset} Q 620 ${200 + offset} 628 ${218 + offset} L 690 ${387 + offset} Q 698 ${404 + offset} 678 ${400 + offset} L 255 ${333 + offset} Q 231 ${325 + offset} 255 ${300 + offset} Z`;
    regions.push(
      shape(bread(120), 12, 500, 472),
      shape(bread(80), 1, 500, 432),
      shape(
        'M 255 340 L 605 245 Q 620 240 628 258 L 690 427 Q 698 444 678 440 L 640 435 L 626 446 L 598 432 L 583 441 L 555 425 L 540 433 L 510 418 L 495 425 L 465 409 L 450 417 L 420 402 L 405 409 L 375 395 L 360 403 L 330 389 L 315 396 L 280 381 L 255 373 Q 231 365 255 340 Z',
        4,
        365,
        379,
      ),
      shape('M 410 363 L 625 395 L 585 443 Z', 3, 570, 411),
      shape(bread(0), 11, 500, 300),
    );
    for (const [x, y] of [
      [730, 285],
      [790, 355],
      [730, 430],
    ] as const) {
      regions.push(
        shape(
          `M ${x} ${y} Q ${x - 28} ${y + 12} ${x - 24} ${y + 40} Q ${x - 7} ${y + 65} ${x + 23} ${y + 45} Q ${x + 43} ${y + 18} ${x + 18} ${y + 1} Q ${x + 7} ${y - 6} ${x} ${y} Z`,
          11,
          x + 5,
          y + 28,
        ),
      );
      details.push(
        `<path d="M ${x - 15} ${y + 29} Q ${x} ${y + 12} ${x + 18} ${y + 12} M ${x - 11} ${y + 47} Q ${x + 5} ${y + 49} ${x + 22} ${y + 35}" fill="none" stroke="#9a633b" stroke-width="3"/>`,
      );
    }
    details.push(
      '<path d="M 275 310 L 607 220 M 648 380 L 288 325" fill="none" stroke="#ca8a42" stroke-width="5"/><circle cx="425" cy="275" r="3" fill="#ca8a42" stroke="none"/><circle cx="475" cy="305" r="3" fill="#ca8a42" stroke="none"/><circle cx="535" cy="250" r="3" fill="#ca8a42" stroke="none"/><circle cx="570" cy="305" r="3" fill="#ca8a42" stroke="none"/>',
    );
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
  ...PLANETS.map(dwarfPlanet),
  ...(
    [
      ['police-car', 'Police Car', 10],
      ['ambulance', 'Ambulance', 9],
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
  return `<svg viewBox="0 0 ${p.width} ${p.height}" aria-hidden="true" focusable="false"><g stroke="#344757" stroke-width="5" stroke-linejoin="round">${p.regions.map((r) => `<path d="${r.path}" fill="${COLORS[r.color - 1]!.hex}"/>`).join('')}</g><g stroke="#344757" stroke-width="5" fill="#344757" font-family="Arial" font-size="22" text-anchor="middle">${p.details.join('')}</g></svg>`;
}
