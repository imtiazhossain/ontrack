import type { ExerciseTemplate } from './muscle-data';

export type ExerciseLoadKind = 'bodyweight' | 'weighted';

/** Equipment strings that count as bodyweight (no external load). */
const BODYWEIGHT_EQUIPMENT = new Set([
  'bodyweight',
  'pull-up bar',
  'jump rope',
  'sliders',
]);

export function exerciseLoadKind(exercise: Pick<ExerciseTemplate, 'equipment'>): ExerciseLoadKind {
  return BODYWEIGHT_EQUIPMENT.has(exercise.equipment.trim().toLowerCase())
    ? 'bodyweight'
    : 'weighted';
}

export function filterExercisesByLoadKind(
  exercises: ExerciseTemplate[],
  kind: ExerciseLoadKind,
): ExerciseTemplate[] {
  return exercises.filter((exercise) => exerciseLoadKind(exercise) === kind);
}
