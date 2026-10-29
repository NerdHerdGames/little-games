export type TouchControlProfile = 'full' | 'directions' | 'action' | 'platformer' | 'jump' | 'none';

export interface TouchControlVisibility {
  directions: boolean;
  action: boolean;
}

export function getTouchControlVisibility(profile: TouchControlProfile): TouchControlVisibility {
  return {
    directions: profile === 'full' || profile === 'directions' || profile === 'platformer',
    action:
      profile === 'full' || profile === 'action' || profile === 'platformer' || profile === 'jump',
  };
}
