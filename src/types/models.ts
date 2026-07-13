import type { CategoryColorKey } from '@/design-system';

export type ActivityStatus = 'upcoming' | 'completed' | 'partial' | 'skipped';

export interface ActivityCategory {
  id: string;
  name: string;
  /** SF Symbol name */
  icon: string;
  colorKey: CategoryColorKey;
  supportsPhotos: boolean;
  supportsTimer: boolean;
  /** Which detail experience opens when tapped */
  detailKind: 'food' | 'gym' | 'work' | 'movie' | 'sleep' | 'generic';
  isCustom?: boolean;
}

export type RecurrenceFrequency = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** 0 = Sunday … 6 = Saturday. Used when frequency is 'weekly'. */
  weekday?: number;
}

export interface Activity {
  id: string;
  /** Date key in YYYY-MM-DD */
  date: string;
  title: string;
  categoryId: string;
  /** Minutes from midnight */
  startMinutes: number;
  durationMinutes: number;
  status: ActivityStatus;
  notes?: string;
  /** Short human summary shown on the card, e.g. "620 kcal · balanced" */
  summary?: string;
  photo?: string | number;
  recurrence?: RecurrenceRule;
  createdAt: string;
  updatedAt: string;
}

// ── Food ────────────────────────────────────────────────────────────────

export type MealType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'pre-workout'
  | 'post-workout';

export interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** 0–1 detection confidence from AI, undefined for manual entries */
  confidence?: number;
}

export interface MealAnalysis {
  items: FoodItem[];
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  /** Supportive, non-judgmental observations */
  observations: string[];
  disclaimer: string;
}

export interface Meal {
  activityId: string;
  mealType: MealType;
  name: string;
  photo?: string | number;
  /** Original AI output, never mutated after analysis */
  aiAnalysis?: MealAnalysis;
  /** User-corrected items; source of truth for display */
  items: FoodItem[];
  hungerBefore?: number;
  fullnessAfter?: number;
  notes?: string;
}

// ── Workouts ────────────────────────────────────────────────────────────

export interface WorkoutSet {
  id: string;
  reps: number;
  weightKg: number;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  /** SF Symbol name */
  icon: string;
  sets: WorkoutSet[];
  restSeconds: number;
  note?: string;
  /** Best set from previous sessions, e.g. "60 kg × 8" */
  previousBest?: string;
}

export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'custom';

export interface Workout {
  activityId: string;
  type: WorkoutType;
  name: string;
  exercises: WorkoutExercise[];
  perceivedDifficulty?: number;
  notes?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface WorkoutRecommendation {
  name: string;
  reason: string;
  exercises: { name: string; icon: string; sets: number; reps: number; weightKg: number; restSeconds: number }[];
  disclaimer: string;
}

// ── Work ────────────────────────────────────────────────────────────────

export interface WorkTask {
  id: string;
  title: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  estimateMinutes?: number;
}

export interface WorkSession {
  activityId: string;
  tasks: WorkTask[];
  focusMinutes: number;
  notes?: string;
}

// ── Movies ────────────────────────────────────────────────────

export interface Movie {
  activityId: string;
  tmdbId: number;
  /** Missing on movie records saved before TV search was introduced. */
  mediaType?: 'movie' | 'tv';
  title: string;
  releaseDate?: string;
  posterUrl?: string;
  overview: string;
  runtimeMinutes?: number;
  genres: string[];
}

// ── AI summaries ────────────────────────────────────────────────────────

export interface DailySummary {
  headline: string;
  body: string;
  suggestion: string;
}
