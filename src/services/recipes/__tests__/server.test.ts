import {
  assertRecipeAnalysisEnabled,
  draftFromRecipeJsonLd,
  extractRecipeJsonLd,
  recipeAIProvider,
  validateRecipeImportDraft,
} from '@/services/recipes/server';

describe('recipe import validation', () => {
  it('finds schema.org Recipe data before scripts are stripped', () => {
    const html = `
      <script type="application/ld+json">
        {"@context":"https://schema.org","@graph":[
          {"@type":"Organization","name":"Example"},
          {"@type":["Recipe","Thing"],"name":"Soup","recipeIngredient":["1 cup stock"]}
        ]}
      </script>
      <script type="application/ld+json">{not valid}</script>
    `;
    expect(extractRecipeJsonLd(html)).toEqual([
      expect.objectContaining({ name: 'Soup' }),
    ]);
  });

  it('sanitizes and bounds a structured recipe draft', () => {
    const draft = validateRecipeImportDraft(
      {
        name: '  Tomato   Soup ',
        originalServings: 4,
        targetServings: null,
        confidence: 1.4,
        warnings: [' Check salt '],
        ingredients: [{
          name: ' Tomatoes ',
          canonicalKey: 'Fresh_Tomatoes',
          quantityValue: 4,
          quantityText: '4',
          unit: 'count',
          preparation: null,
          originalText: '4 tomatoes',
          confidence: 0.9,
        }],
      },
      { kind: 'url', url: 'https://example.com/soup' },
    );

    expect(draft).toMatchObject({
      name: 'Tomato Soup',
      sourceUrl: 'https://example.com/soup',
      targetServings: 4,
      confidence: 1,
      warnings: ['Check salt'],
    });
    expect(draft.ingredients[0].canonicalKey).toBe('fresh tomatoes');
  });

  it('rejects a result without a named ingredient', () => {
    expect(() =>
      validateRecipeImportDraft(
        { name: 'Empty', ingredients: [], confidence: 0, warnings: [] },
        { kind: 'image' },
      ),
    ).toThrow('NO_RECIPE_FOUND');
  });

  it('reuses the configured free local meal provider', () => {
    const original = {
      recipeEnabled: process.env.RECIPE_AI_ENABLED,
      recipeProvider: process.env.RECIPE_AI_PROVIDER,
      mealProvider: process.env.MEAL_AI_PROVIDER,
      localRecipeEnabled: process.env.LOCAL_RECIPE_AI_ENABLED,
      localMealEnabled: process.env.LOCAL_MEAL_AI_ENABLED,
      openAIKey: process.env.OPENAI_API_KEY,
    };
    process.env.RECIPE_AI_ENABLED = 'true';
    delete process.env.RECIPE_AI_PROVIDER;
    process.env.MEAL_AI_PROVIDER = 'ollama';
    delete process.env.LOCAL_RECIPE_AI_ENABLED;
    process.env.LOCAL_MEAL_AI_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    try {
      expect(recipeAIProvider()).toBe('ollama');
      expect(assertRecipeAnalysisEnabled()).toBeUndefined();
    } finally {
      restoreEnv('RECIPE_AI_ENABLED', original.recipeEnabled);
      restoreEnv('RECIPE_AI_PROVIDER', original.recipeProvider);
      restoreEnv('MEAL_AI_PROVIDER', original.mealProvider);
      restoreEnv('LOCAL_RECIPE_AI_ENABLED', original.localRecipeEnabled);
      restoreEnv('LOCAL_MEAL_AI_ENABLED', original.localMealEnabled);
      restoreEnv('OPENAI_API_KEY', original.openAIKey);
    }
  });

  it('imports a complete schema.org recipe without provider analysis', () => {
    const draft = draftFromRecipeJsonLd(
      [{
        '@type': 'Recipe',
        name: 'Meatloaf Recipe',
        recipeYield: ['8', '8 servings'],
        recipeIngredient: [
          '2 lbs ground beef (85% or 80% lean*)',
          '1 med onion ((1 cup), finely chopped)',
          '2 large eggs',
          '3/4 cup Panko breadcrumbs (or gluten-free bread crumbs)',
          '1 ½ tsp white vinegar',
          '1 tsp salt (or to taste)',
        ],
      }],
      'https://natashaskitchen.com/meatloaf-recipe/',
    );

    expect(draft).toMatchObject({
      name: 'Meatloaf Recipe',
      originalServings: 8,
      targetServings: 8,
      sourceUrl: 'https://natashaskitchen.com/meatloaf-recipe/',
      confidence: 0.98,
    });
    expect(draft?.ingredients).toEqual([
      expect.objectContaining({
        name: 'ground beef',
        quantityValue: 2,
        unit: 'lb',
      }),
      expect.objectContaining({
        name: 'onion',
        quantityValue: 1,
        preparation: 'med, 1 cup, finely chopped',
      }),
      expect.objectContaining({
        name: 'eggs',
        quantityValue: 2,
        preparation: 'large',
      }),
      expect.objectContaining({
        name: 'Panko breadcrumbs',
        quantityValue: 0.75,
        unit: 'cup',
      }),
      expect.objectContaining({
        name: 'white vinegar',
        quantityValue: 1.5,
        unit: 'tsp',
      }),
      expect.objectContaining({
        name: 'salt',
        quantityValue: 1,
        unit: 'tsp',
      }),
    ]);
    expect(draft?.warnings).toHaveLength(1);
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
