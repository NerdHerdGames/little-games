import { createTimingMatch } from '../timing/rules';

export const HAUMEA_MATCH_COUNT = 5;
export const HAUMEA_TIMING_TOLERANCE = Math.PI / 6.5;
export const HAUMEA_ORBIT_RADIANS_PER_MS = (Math.PI * 2) / 18_000;

export const createHaumeaMission = () => createTimingMatch(HAUMEA_MATCH_COUNT);
