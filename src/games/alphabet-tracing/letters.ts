export interface Point {
  x: number;
  y: number;
}

export interface Letter {
  letter: string;
  name: string;
  sound: string;
  example: string;
  strokes: readonly (readonly Point[])[];
}

const line = (...coordinates: number[]): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < coordinates.length; i += 2)
    points.push({ x: coordinates[i]!, y: coordinates[i + 1]! });
  return points;
};

/** Sample a cubic curve into ordinary points so tracing rules need no browser or renderer. */
const curve = (...coordinates: number[]): Point[] => {
  const result = line(coordinates[0]!, coordinates[1]!);
  for (let i = 2; i < coordinates.length; i += 6) {
    const start = result.at(-1)!;
    for (let step = 1; step <= 24; step++) {
      const t = step / 24;
      const u = 1 - t;
      result.push({
        x:
          u ** 3 * start.x +
          3 * u ** 2 * t * coordinates[i]! +
          3 * u * t ** 2 * coordinates[i + 2]! +
          t ** 3 * coordinates[i + 4]!,
        y:
          u ** 3 * start.y +
          3 * u ** 2 * t * coordinates[i + 1]! +
          3 * u * t ** 2 * coordinates[i + 3]! +
          t ** 3 * coordinates[i + 5]!,
      });
    }
  }
  return result;
};

const definition = (
  letter: string,
  name: string,
  sound: string,
  example: string,
  ...strokes: Point[][]
): Letter => ({ letter, name, sound, example, strokes });

// Uppercase manuscript strokes. A uses the requested “ah” sound; C and G use hard sounds.
export const LETTERS: readonly Letter[] = [
  definition(
    'A',
    'ay',
    'ah',
    'apple',
    line(195, 75, 95, 325),
    line(195, 75, 295, 325),
    line(135, 225, 255, 225),
  ),
  definition(
    'B',
    'bee',
    'buh',
    'ball',
    line(115, 75, 115, 325),
    curve(115, 75, 315, 60, 315, 200, 115, 200),
    curve(115, 200, 330, 185, 330, 340, 115, 325),
  ),
  definition('C', 'see', 'kuh', 'cat', curve(285, 105, 65, -25, 25, 430, 285, 295)),
  definition(
    'D',
    'dee',
    'duh',
    'dog',
    line(110, 75, 110, 325),
    curve(110, 75, 360, 60, 360, 340, 110, 325),
  ),
  definition(
    'E',
    'ee',
    'eh',
    'egg',
    line(115, 75, 115, 325),
    line(115, 75, 285, 75),
    line(115, 200, 260, 200),
    line(115, 325, 285, 325),
  ),
  definition(
    'F',
    'ef',
    'fuh',
    'fish',
    line(115, 75, 115, 325),
    line(115, 75, 285, 75),
    line(115, 200, 260, 200),
  ),
  definition(
    'G',
    'jee',
    'guh',
    'goat',
    curve(280, 105, 65, -25, 25, 430, 285, 295),
    line(285, 295, 285, 215, 215, 215),
  ),
  definition(
    'H',
    'aitch',
    'huh',
    'hat',
    line(105, 75, 105, 325),
    line(285, 75, 285, 325),
    line(105, 200, 285, 200),
  ),
  definition(
    'I',
    'eye',
    'ih',
    'igloo',
    line(195, 75, 195, 325),
    line(115, 75, 275, 75),
    line(115, 325, 275, 325),
  ),
  definition(
    'J',
    'jay',
    'juh',
    'jam',
    [...line(270, 75, 270, 260), ...curve(270, 260, 270, 350, 100, 350, 100, 265).slice(1)],
    line(180, 75, 305, 75),
  ),
  definition(
    'K',
    'kay',
    'kuh',
    'kite',
    line(110, 75, 110, 325),
    line(290, 75, 110, 215),
    line(180, 160, 295, 325),
  ),
  definition('L', 'el', 'luh', 'leaf', line(115, 75, 115, 325), line(115, 325, 285, 325)),
  definition(
    'M',
    'em',
    'muh',
    'moon',
    line(85, 75, 85, 325),
    line(85, 75, 195, 235, 305, 75),
    line(305, 75, 305, 325),
  ),
  definition(
    'N',
    'en',
    'nuh',
    'nest',
    line(105, 75, 105, 325),
    line(105, 75, 285, 325),
    line(285, 75, 285, 325),
  ),
  definition(
    'O',
    'oh',
    'aw',
    'octopus',
    curve(195, 75, 55, 75, 55, 325, 195, 325, 335, 325, 335, 75, 195, 75),
  ),
  definition(
    'P',
    'pee',
    'puh',
    'pig',
    line(115, 75, 115, 325),
    curve(115, 75, 330, 50, 330, 225, 115, 210),
  ),
  definition(
    'Q',
    'cue',
    'kwuh',
    'queen',
    curve(195, 75, 55, 75, 55, 315, 195, 315, 335, 315, 335, 75, 195, 75),
    line(220, 255, 305, 335),
  ),
  definition(
    'R',
    'ar',
    'ruh',
    'rain',
    line(115, 75, 115, 325),
    curve(115, 75, 330, 50, 330, 225, 115, 210),
    line(200, 210, 295, 325),
  ),
  definition(
    'S',
    'ess',
    'sss',
    'sun',
    curve(280, 105, 160, 10, 30, 155, 195, 200, 365, 245, 230, 390, 105, 295),
  ),
  definition('T', 'tee', 'tuh', 'tree', line(90, 75, 300, 75), line(195, 75, 195, 325)),
  definition('U', 'you', 'uh', 'up', [
    ...line(105, 75, 105, 245),
    ...curve(105, 245, 105, 355, 285, 355, 285, 245).slice(1),
    ...line(285, 75),
  ]),
  definition('V', 'vee', 'vuh', 'van', line(95, 75, 195, 325, 295, 75)),
  definition('W', 'double you', 'wuh', 'web', line(65, 75, 125, 325, 195, 165, 265, 325, 325, 75)),
  definition('X', 'ex', 'ks', 'fox', line(105, 75, 285, 325), line(285, 75, 105, 325)),
  definition('Y', 'why', 'yuh', 'yo-yo', line(95, 75, 195, 200), line(295, 75, 195, 200, 195, 325)),
  definition('Z', 'zee', 'zzz', 'zebra', line(105, 75, 285, 75, 105, 325, 285, 325)),
];
