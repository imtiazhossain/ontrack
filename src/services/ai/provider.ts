import type { DailySummary, MealAnalysis, WorkoutRecommendation } from '@/types/models';

/**
 * AI provider abstraction. Feature screens depend only on this interface,
 * so the mock can be replaced by a real backend (e.g. Supabase Edge
 * Functions) without touching any UI code.
 */
export interface AIProvider {
  analyzeMealPhoto(input: { photoUri?: string; mealName?: string }): Promise<MealAnalysis>;
  recommendWorkout(input: {
    goal: string;
    recentWorkoutNames: string[];
  }): Promise<WorkoutRecommendation>;
  summarizeDay(input: {
    dateKey: string;
    completed: number;
    total: number;
    skippedTitles: string[];
  }): Promise<DailySummary>;
}

export const AI_DISCLAIMER =
  'AI estimates are approximate and informational only — not medical or professional advice.';
