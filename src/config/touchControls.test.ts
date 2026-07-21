import { describe, expect, it } from 'vitest';
import { getTouchControlProfile } from './touchControls';

describe('touch control profiles', () => {
  it('uses the requested layout for each top-level game', () => {
    expect(getTouchControlProfile('StarCollector')).toBe('directions');
    expect(getTouchControlProfile('MainMenu')).toBe('full');
    expect(getTouchControlProfile('SolarSystemExplorer')).toBe('full');
    expect(getTouchControlProfile('FishTankQuiz')).toBe('none');
    expect(getTouchControlProfile('PlanetFactMatch')).toBe('none');
    expect(getTouchControlProfile('DwarfFactMatch')).toBe('none');
    expect(getTouchControlProfile('SolarSystemOrder')).toBe('none');
    expect(getTouchControlProfile('FishShapeMatch')).toBe('none');
    expect(getTouchControlProfile('ShapeFlipMatch')).toBe('none');
    expect(getTouchControlProfile('TractorTrailer')).toBe('action');
  });

  it('keeps the full layout throughout Dwarf Planet Explorer', () => {
    expect(getTouchControlProfile('PlanetSelect')).toBe('full');
    expect(getTouchControlProfile('PlutoMission')).toBe('full');
    expect(getTouchControlProfile('FactCard')).toBe('full');
  });

  it('hides touch controls in shared non-game screens', () => {
    expect(getTouchControlProfile('Boot')).toBe('none');
    expect(getTouchControlProfile('GameHub')).toBe('none');
  });
});
