import {
  createSamplePlant,
  ensurePlantSample,
  isSamplePlant,
  PLANT_SAMPLE_VERSION,
  SAMPLE_PLANT_ID,
} from '../sample';

describe('plant sample', () => {
  it('creates a complete sample plant under care', () => {
    const plant = createSamplePlant('2026-07-31T12:00:00.000Z');
    expect(plant.id).toBe(SAMPLE_PLANT_ID);
    expect(isSamplePlant(plant)).toBe(true);
    expect(plant.carePlan.soil.soilType).toMatch(/aroid/i);
    expect(plant.carePlan.soil.phMin).toBeLessThanOrEqual(plant.carePlan.soil.phMax);
    expect(plant.health.actions.length).toBeGreaterThan(0);
    expect(plant.checkIns).toHaveLength(1);
  });

  it('seeds an empty shelf and respects dismissal', () => {
    const seeded = ensurePlantSample([], 0);
    expect(seeded.plants).toHaveLength(1);
    expect(seeded.sampleVersion).toBe(PLANT_SAMPLE_VERSION);
    expect(seeded.sampleDismissed).toBe(false);

    const dismissed = ensurePlantSample([], PLANT_SAMPLE_VERSION, true);
    expect(dismissed.plants).toHaveLength(0);
    expect(dismissed.sampleDismissed).toBe(true);
  });

  it('does not replace a user’s existing plants during sample upgrade', () => {
    const existing = [{ ...createSamplePlant(), id: 'plant-custom', nickname: 'Fern' }];
    const upgraded = ensurePlantSample(existing, 0);
    expect(upgraded.plants).toEqual(existing);
    expect(upgraded.sampleVersion).toBe(PLANT_SAMPLE_VERSION);
  });
});
