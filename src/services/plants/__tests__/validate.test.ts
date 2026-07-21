import { canUsePlantIdentityForCare, hasConfidentPlantIdentity, validatePlantCarePlan, validatePlantHealth, validatePlantIdentity } from '@/services/plants/validate';

const carePlan = {
  watering: {
    minMl: 200,
    maxMl: 350,
    intervalDays: 9,
    soilCheck: 'Water when the top 3 cm are dry.',
    notes: 'Drain excess water.',
  },
  pruning: { urgency: 'soon', reason: 'One leaf is visibly damaged.', steps: ['Use clean shears.'] },
  placement: {
    light: 'Bright, indirect light.',
    location: 'Beside the east window.',
    windowDistance: 'About 1 metre from the glass.',
    avoid: ['Heating vents'],
  },
  sources: [{ title: 'University Extension', url: 'https://extension.umn.edu/houseplants' }],
  disclaimer: 'Use this as a starting point because indoor conditions vary.',
};

describe('plant AI response validation', () => {
  it('accepts a complete, bounded plant identity and health assessment', () => {
    expect(validatePlantIdentity({ commonName: 'Pothos', scientificName: 'Epipremnum aureum', confidence: 0.91 }))
      .toMatchObject({ commonName: 'Pothos', confidence: 0.91 });
    expect(validatePlantHealth({
      status: 'watch', summary: 'A few leaves are yellowing.', visibleSigns: ['Two yellow leaves'],
      possibleCauses: ['Watering stress'], actions: ['Check soil moisture'], confidence: 0.8,
    })).toMatchObject({ status: 'watch', visibleSigns: ['Two yellow leaves'] });
  });

  it('rejects unbounded confidence and unsupported health shapes', () => {
    expect(validatePlantIdentity({ commonName: 'Pothos', scientificName: 'Epipremnum aureum', confidence: 1.2 })).toBeNull();
    expect(validatePlantHealth({ status: 'diagnosed', summary: 'Root rot', visibleSigns: [], possibleCauses: [], actions: [], confidence: 0.8 })).toBeNull();
  });

  it('requires at least 80% identification confidence before care planning', () => {
    expect(hasConfidentPlantIdentity({ commonName: 'Pothos', scientificName: 'Epipremnum aureum', confidence: 0.8 })).toBe(true);
    expect(hasConfidentPlantIdentity({ commonName: 'Unknown', scientificName: 'Unknown species', confidence: 0.79 })).toBe(false);
  });

  it('requires the user to confirm or correct an AI identity before care planning', () => {
    expect(canUsePlantIdentityForCare({ commonName: 'Pothos', scientificName: 'Epipremnum aureum', confidence: 0.95, identificationSource: 'ai' })).toBe(false);
    expect(canUsePlantIdentityForCare({ commonName: 'Ginger', scientificName: 'Ginger species', confidence: 0.2, identificationSource: 'user-corrected' })).toBe(true);
    expect(validatePlantIdentity({ commonName: 'Ginger', scientificName: 'Ginger species', confidence: 0.2, identificationSource: 'unverified' })).toBeNull();
  });

  it('accepts a conservative watering range with HTTPS sources', () => {
    expect(validatePlantCarePlan(carePlan)).toMatchObject({
      watering: { minMl: 200, maxMl: 350, intervalDays: 9 },
      sources: [{ title: 'University Extension' }],
    });
  });

  it('rejects inverted ranges, exact zero water, and non-HTTPS sources', () => {
    expect(validatePlantCarePlan({ ...carePlan, watering: { ...carePlan.watering, minMl: 400, maxMl: 200 } })).toBeNull();
    expect(validatePlantCarePlan({ ...carePlan, watering: { ...carePlan.watering, minMl: 0 } })).toBeNull();
    expect(validatePlantCarePlan({ ...carePlan, sources: [{ title: 'Unsafe', url: 'http://example.com' }] })).toBeNull();
  });
});
