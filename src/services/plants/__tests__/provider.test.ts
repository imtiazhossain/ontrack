import { assertPlantAnalysisEnabled, validateLocalCarePlan } from '@/services/plants/server';

const ORIGINAL_ENV = { ...process.env };

describe('plant AI provider selection', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('reuses the enabled local meal-analysis provider by default', () => {
    delete process.env.PLANT_AI_PROVIDER;
    process.env.MEAL_AI_PROVIDER = 'ollama';
    process.env.LOCAL_MEAL_AI_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;
    expect(assertPlantAnalysisEnabled()).toBeUndefined();
  });

  it('supports an independently enabled local plant provider', () => {
    process.env.PLANT_AI_PROVIDER = 'ollama';
    process.env.LOCAL_MEAL_AI_ENABLED = 'false';
    process.env.LOCAL_PLANT_AI_ENABLED = 'true';
    expect(assertPlantAnalysisEnabled()).toBeUndefined();
  });

  it('keeps the local provider gated when neither local feature is enabled', () => {
    process.env.PLANT_AI_PROVIDER = 'ollama';
    process.env.LOCAL_MEAL_AI_ENABLED = 'false';
    process.env.LOCAL_PLANT_AI_ENABLED = 'false';
    expect(assertPlantAnalysisEnabled()).toMatchObject({ status: 503 });
  });

  it('attaches fixed references and normalizes contradictory local pruning output', () => {
    const plan = validateLocalCarePlan({
      watering: { minMl: 200, maxMl: 400, intervalDays: 10, soilCheck: 'Check the top 3 cm.', notes: 'Drain excess.' },
      pruning: { urgency: 'now', reason: 'No pruning is needed for this healthy plant.', steps: [] },
      placement: { light: 'Bright indirect light', location: 'Near the east window', windowDistance: '1 m', avoid: [] },
      sources: [{ title: 'Model supplied', url: 'https://example.com' }],
      disclaimer: 'Model supplied',
    });
    expect(plan?.pruning.urgency).toBe('not-needed');
    expect(plan?.sources.map((source) => source.title)).toEqual([
      'University of Minnesota Extension — Houseplants',
      'Royal Horticultural Society — Houseplants',
    ]);
  });
});
