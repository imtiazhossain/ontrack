import {
  validateDailySummary,
  validateMealAnalysis,
  validateWorkoutRecommendation,
} from '@/services/ai/validate';

const validMeal = {
  items: [
    {
      id: '1',
      name: 'Chicken',
      portion: '150 g',
      calories: 200,
      proteinG: 30,
      carbsG: 0,
      fatG: 5,
    },
  ],
  totalCalories: 200,
  proteinG: 30,
  carbsG: 0,
  fatG: 5,
  fiberG: 0,
  nutrients: [],
  sources: [],
  recommendations: [],
  reviewRequired: true,
  observations: ['Good source of protein.'],
  disclaimer: 'Estimate only.',
};

describe('validateMealAnalysis', () => {
  it('accepts valid meal analysis', () => {
    expect(validateMealAnalysis(validMeal)).toEqual(validMeal);
  });

  it('rejects missing disclaimer', () => {
    expect(validateMealAnalysis({ ...validMeal, disclaimer: '' })).toBeNull();
  });

  it('rejects empty items', () => {
    expect(validateMealAnalysis({ ...validMeal, items: [] })).toBeNull();
  });
});

describe('validateWorkoutRecommendation', () => {
  const validWorkout = {
    name: 'Leg day',
    reason: 'Balance upper body work.',
    disclaimer: 'Not medical advice.',
    exercises: [{ name: 'Squat', icon: 'figure.walk', sets: 3, reps: 10, weightKg: 40, restSeconds: 90 }],
  };

  it('accepts valid workout recommendation', () => {
    expect(validateWorkoutRecommendation(validWorkout)).toEqual(validWorkout);
  });

  it('rejects zero sets', () => {
    expect(
      validateWorkoutRecommendation({
        ...validWorkout,
        exercises: [{ name: 'Squat', icon: 'figure.walk', sets: 0, reps: 10, weightKg: 40, restSeconds: 90 }],
      }),
    ).toBeNull();
  });
});

describe('validateDailySummary', () => {
  it('accepts valid summary', () => {
    const summary = {
      headline: 'Solid day',
      body: 'You completed 5 of 6 activities.',
      suggestion: 'Protect your morning block tomorrow.',
    };
    expect(validateDailySummary(summary)).toEqual(summary);
  });
});
