import type { DailySummary, MealAnalysis, WorkoutRecommendation } from '@/types/models';
import { AI_DISCLAIMER, type AIProvider } from './provider';
import { validateDailySummary, validateMealAnalysis, validateWorkoutRecommendation } from './validate';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function pick<T>(arr: readonly T[], seedText: string): T {
  let h = 0;
  for (let i = 0; i < seedText.length; i++) h = (h * 31 + seedText.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

const MEAL_LIBRARY: Omit<MealAnalysis, 'disclaimer'>[] = [
  {
    items: [
      { id: 'ai-1', name: 'Grilled chicken breast', portion: '~150 g', calories: 248, proteinG: 46, carbsG: 0, fatG: 5, confidence: 0.92 },
      { id: 'ai-2', name: 'Mixed green salad', portion: '~2 cups', calories: 30, proteinG: 2, carbsG: 5, fatG: 0, confidence: 0.88 },
      { id: 'ai-3', name: 'Quinoa', portion: '~3/4 cup', calories: 166, proteinG: 6, carbsG: 29, fatG: 3, confidence: 0.74 },
      { id: 'ai-4', name: 'Olive oil dressing', portion: '~1 tbsp', calories: 119, proteinG: 0, carbsG: 0, fatG: 14, confidence: 0.51 },
    ],
    totalCalories: 563, proteinG: 54, carbsG: 34, fatG: 22, fiberG: 6,
    nutrients: [], sources: [], recommendations: [], reviewRequired: true,
    observations: [
      'Good source of protein.',
      'This meal appears balanced.',
      'Nice mix of greens and whole grains.',
    ],
  },
  {
    items: [
      { id: 'ai-5', name: 'Baked salmon', portion: '~180 g', calories: 367, proteinG: 39, carbsG: 0, fatG: 22, confidence: 0.9 },
      { id: 'ai-6', name: 'Roast vegetables', portion: '~1.5 cups', calories: 120, proteinG: 3, carbsG: 18, fatG: 5, confidence: 0.85 },
      { id: 'ai-7', name: 'Brown rice', portion: '~3/4 cup', calories: 165, proteinG: 4, carbsG: 34, fatG: 1, confidence: 0.79 },
    ],
    totalCalories: 652, proteinG: 46, carbsG: 52, fatG: 28, fiberG: 8,
    nutrients: [], sources: [], recommendations: [], reviewRequired: true,
    observations: [
      'Rich in omega-3 fats.',
      'This meal appears balanced.',
      'This supports your strength goal.',
    ],
  },
  {
    items: [
      { id: 'ai-8', name: 'Greek yogurt', portion: '~1 cup', calories: 150, proteinG: 20, carbsG: 8, fatG: 4, confidence: 0.93 },
      { id: 'ai-9', name: 'Blueberries', portion: '~1/2 cup', calories: 42, proteinG: 1, carbsG: 11, fatG: 0, confidence: 0.9 },
      { id: 'ai-10', name: 'Granola', portion: '~1/4 cup', calories: 140, proteinG: 3, carbsG: 18, fatG: 6, confidence: 0.68 },
    ],
    totalCalories: 332, proteinG: 24, carbsG: 37, fatG: 10, fiberG: 4,
    nutrients: [], sources: [], recommendations: [], reviewRequired: true,
    observations: [
      'Good source of protein.',
      'Consider adding a source of healthy fats such as nuts.',
    ],
  },
];

const WORKOUT_LIBRARY: Omit<WorkoutRecommendation, 'disclaimer'>[] = [
  {
    name: 'Lower body strength',
    reason: 'Your recent sessions focused on upper body, so training legs balances the week and gives pressing muscles time to recover.',
    exercises: [
      { name: 'Goblet squat', icon: 'figure.strengthtraining.functional', sets: 3, reps: 10, weightKg: 24, restSeconds: 120 },
      { name: 'Romanian deadlift', icon: 'figure.strengthtraining.traditional', sets: 3, reps: 10, weightKg: 50, restSeconds: 120 },
      { name: 'Walking lunge', icon: 'figure.walk', sets: 3, reps: 12, weightKg: 12, restSeconds: 90 },
      { name: 'Calf raise', icon: 'figure.stand', sets: 3, reps: 15, weightKg: 30, restSeconds: 60 },
    ],
  },
  {
    name: 'Full body reset',
    reason: 'A moderate full-body session keeps momentum without overloading any single muscle group after your recent training.',
    exercises: [
      { name: 'Dumbbell bench press', icon: 'figure.strengthtraining.traditional', sets: 3, reps: 10, weightKg: 22, restSeconds: 90 },
      { name: 'Goblet squat', icon: 'figure.strengthtraining.functional', sets: 3, reps: 12, weightKg: 20, restSeconds: 90 },
      { name: 'One-arm row', icon: 'figure.rower', sets: 3, reps: 10, weightKg: 24, restSeconds: 90 },
      { name: 'Plank', icon: 'figure.core.training', sets: 3, reps: 45, weightKg: 0, restSeconds: 60 },
    ],
  },
];

const SUMMARY_HEADLINES = [
  'A steady, well-paced day.',
  'Quiet consistency wins.',
  'Momentum is on your side.',
  'A day built one block at a time.',
];

/**
 * Mock AI provider. Responses are clearly labeled as samples and run
 * through the same validation path a real provider response would.
 */
export class MockAIProvider implements AIProvider {
  async analyzeMealPhoto(input: { photoUri?: string; mealName?: string }): Promise<MealAnalysis> {
    await delay(1800);
    const base = pick(MEAL_LIBRARY, input.photoUri ?? input.mealName ?? 'meal');
    const candidate: MealAnalysis = {
      ...base,
      items: base.items.map((i) => ({ ...i, id: `${i.id}-${Date.now()}` })),
      disclaimer: AI_DISCLAIMER,
    };
    const valid = validateMealAnalysis(candidate);
    if (!valid) throw new Error('AI response failed validation');
    return valid;
  }

  async recommendWorkout(input: { goal: string; recentWorkoutNames: string[] }): Promise<WorkoutRecommendation> {
    await delay(1400);
    const base = pick(WORKOUT_LIBRARY, input.goal + input.recentWorkoutNames.join(','));
    const candidate: WorkoutRecommendation = { ...base, disclaimer: AI_DISCLAIMER };
    const valid = validateWorkoutRecommendation(candidate);
    if (!valid) throw new Error('AI response failed validation');
    return valid;
  }

  async summarizeDay(input: {
    dateKey: string;
    completed: number;
    total: number;
    skippedTitles: string[];
  }): Promise<DailySummary> {
    await delay(600);
    const headline = pick(SUMMARY_HEADLINES, input.dateKey);
    const body =
      input.total === 0
        ? 'Nothing planned yet — a blank page is an invitation.'
        : `You completed ${input.completed} of ${input.total} planned activities` +
          (input.skippedTitles.length > 0
            ? `, and consciously let ${input.skippedTitles.length === 1 ? 'one thing' : `${input.skippedTitles.length} things`} go.`
            : '.');
    const suggestion =
      input.skippedTitles.length > 0
        ? `If it still matters, "${input.skippedTitles[0]}" could find a home tomorrow.`
        : 'Consider protecting your first deep-work block again tomorrow.';
    const candidate: DailySummary = { headline, body, suggestion };
    const valid = validateDailySummary(candidate);
    if (!valid) throw new Error('AI response failed validation');
    return valid;
  }
}

export const aiProvider: AIProvider = new MockAIProvider();
