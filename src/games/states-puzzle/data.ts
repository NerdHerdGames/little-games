import topology from './source-topology.json';

export interface Point {
  x: number;
  y: number;
}

export interface StateShape {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  rings: Point[][];
  path: string;
  bounds: { x: number; y: number; width: number; height: number };
  center: Point;
}

const ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};

const COLORS = ['#f3bd67', '#90c9b0', '#b3b5e5', '#edac98', '#91c5de', '#c8d890'];

// Decode the bundled Census topology once. Shared arcs keep neighboring borders identical.
const arcs = topology.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map((pair) => {
    x += pair[0]!;
    y += pair[1]!;
    return {
      x:
        Math.round((x * topology.transform.scale[0]! + topology.transform.translate[0]!) * 100) /
        100,
      y:
        Math.round((y * topology.transform.scale[1]! + topology.transform.translate[1]!) * 100) /
        100,
    };
  });
});

const ringFromArcs = (ids: number[]): Point[] => {
  const ring: Point[] = [];
  for (const id of ids) {
    const points = id < 0 ? [...arcs[~id]!].reverse() : arcs[id]!;
    ring.push(...(ring.length ? points.slice(1) : points));
  }
  return ring;
};

const signedArea = (ring: Point[]): number =>
  ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length]!;
    return area + point.x * next.y - next.x * point.y;
  }, 0);

export const STATES: readonly StateShape[] = topology.objects.states.geometries
  .filter(({ properties }) => properties.name in ABBREVIATIONS)
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
  .map((geometry, index) => {
    const polygons =
      geometry.type === 'Polygon' ? [geometry.arcs as number[][]] : (geometry.arcs as number[][][]);
    const rings = polygons.flatMap((polygon) => polygon.map(ringFromArcs));
    const points = rings.flat();
    const x = Math.min(...points.map((point) => point.x));
    const y = Math.min(...points.map((point) => point.y));
    const width = Math.max(...points.map((point) => point.x)) - x;
    const height = Math.max(...points.map((point) => point.y)) - y;
    const main = [...rings].sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))[0]!;
    const area = signedArea(main);
    const center = main.reduce(
      (sum, point, i) => {
        const next = main[(i + 1) % main.length]!;
        const cross = point.x * next.y - next.x * point.y;
        return { x: sum.x + (point.x + next.x) * cross, y: sum.y + (point.y + next.y) * cross };
      },
      { x: 0, y: 0 },
    );
    return {
      id: geometry.id,
      name: geometry.properties.name,
      abbreviation: ABBREVIATIONS[geometry.properties.name]!,
      color: COLORS[index % COLORS.length]!,
      rings,
      path: rings.map((ring) => `M${ring.map(({ x, y }) => `${x},${y}`).join('L')}Z`).join(''),
      bounds: { x, y, width, height },
      center: { x: center.x / (3 * area), y: center.y / (3 * area) },
    };
  });

export const getState = (id: string): StateShape | undefined =>
  STATES.find((state) => state.id === id);
