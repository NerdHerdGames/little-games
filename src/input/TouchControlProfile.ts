export type TouchControlProfile = 'full' | 'directions' | 'action' | 'none';

export interface TouchControlVisibility {
  directions: boolean;
  action: boolean;
}

export function getTouchControlVisibility(profile: TouchControlProfile): TouchControlVisibility {
  return {
    directions: profile === 'full' || profile === 'directions',
    action: profile === 'full' || profile === 'action',
  };
}
