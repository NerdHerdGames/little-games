import { describe, expect, it } from 'vitest';
import { collectBrightSpot, createCeresMission } from './rules';

describe('Ceres mission rules', () => {
  it('completes after exactly three bright spots', () => {
    let mission = createCeresMission();
    mission = collectBrightSpot(mission);
    mission = collectBrightSpot(mission);
    expect(mission.complete).toBe(false);
    mission = collectBrightSpot(mission);
    expect(mission).toEqual({ collected: 3, total: 3, complete: true });
    expect(collectBrightSpot(mission)).toBe(mission);
  });
});
