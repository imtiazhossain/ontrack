import type { DailySummary, FoodItem, MealAnalysis, WorkoutRecommendation } from '@/types/models';

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFoodItem(v: unknown): v is FoodItem {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.name) &&
    typeof o.portion === 'string' &&
    isFiniteNumber(o.calories) &&
    o.calories >= 0 &&
    isFiniteNumber(o.proteinG) &&
    isFiniteNumber(o.carbsG) &&
    isFiniteNumber(o.fatG)
  );
}

function isNutrientValue(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isNonEmptyString(o.name) &&
    isNonEmptyString(o.unit) &&
    typeof o.estimated === 'boolean' &&
    (o.amount === undefined || (isFiniteNumber(o.amount) && o.amount >= 0))
  );
}

function isSource(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return isNonEmptyString(o.id) && isNonEmptyString(o.kind) && isNonEmptyString(o.title);
}

/**
 * Validates a structured AI response before it is stored or rendered.
 * Returns null for anything malformed so callers can fall back safely.
 */
export function validateMealAnalysis(v: unknown): MealAnalysis | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.items) || o.items.length === 0 || !o.items.every(isFoodItem)) return null;
  if (!isFiniteNumber(o.totalCalories) || o.totalCalories < 0) return null;
  if (!isFiniteNumber(o.proteinG) || !isFiniteNumber(o.carbsG) || !isFiniteNumber(o.fatG)) return null;
  if (!isFiniteNumber(o.fiberG)) return null;
  if (!Array.isArray(o.nutrients) || !o.nutrients.every(isNutrientValue)) return null;
  if (!Array.isArray(o.sources) || !o.sources.every(isSource)) return null;
  if (!Array.isArray(o.recommendations)) return null;
  if (typeof o.reviewRequired !== 'boolean') return null;
  if (!Array.isArray(o.observations) || !o.observations.every(isNonEmptyString)) return null;
  if (!isNonEmptyString(o.disclaimer)) return null;
  return o as unknown as MealAnalysis;
}

export function validateWorkoutRecommendation(v: unknown): WorkoutRecommendation | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!isNonEmptyString(o.name) || !isNonEmptyString(o.reason) || !isNonEmptyString(o.disclaimer)) {
    return null;
  }
  if (!Array.isArray(o.exercises) || o.exercises.length === 0) return null;
  for (const e of o.exercises) {
    if (typeof e !== 'object' || e === null) return null;
    const x = e as Record<string, unknown>;
    if (!isNonEmptyString(x.name)) return null;
    if (!isFiniteNumber(x.sets) || x.sets < 1) return null;
    if (!isFiniteNumber(x.reps) || x.reps < 1) return null;
    if (!isFiniteNumber(x.weightKg) || x.weightKg < 0) return null;
    if (!isFiniteNumber(x.restSeconds) || x.restSeconds < 0) return null;
  }
  return o as unknown as WorkoutRecommendation;
}

export function validateDailySummary(v: unknown): DailySummary | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!isNonEmptyString(o.headline) || !isNonEmptyString(o.body) || !isNonEmptyString(o.suggestion)) {
    return null;
  }
  return o as unknown as DailySummary;
}
