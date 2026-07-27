import type { ExerciseTemplate, MuscleKey } from './muscle-data';

export type MovementPattern =
  | 'horizontal-push'
  | 'vertical-press'
  | 'vertical-pull'
  | 'row'
  | 'curl'
  | 'triceps-extension'
  | 'squat'
  | 'knee-extension'
  | 'hinge'
  | 'knee-flexion'
  | 'core'
  | 'carry'
  | 'hip-abduction'
  | 'calf'
  | 'isolation';

export const MOVEMENT_LABELS: Record<MovementPattern, string> = {
  'horizontal-push': 'Horizontal press',
  'vertical-press': 'Overhead press',
  'vertical-pull': 'Vertical pull',
  row: 'Row & retract',
  curl: 'Elbow flexion',
  'triceps-extension': 'Elbow extension',
  squat: 'Squat pattern',
  'knee-extension': 'Knee extension',
  hinge: 'Hip hinge',
  'knee-flexion': 'Knee flexion',
  core: 'Core control',
  carry: 'Loaded carry',
  'hip-abduction': 'Hip abduction',
  calf: 'Plantar flexion',
  isolation: 'Controlled isolation',
};

const EXERCISE_PATTERNS: Partial<Record<string, MovementPattern>> = {
  'bench-press': 'horizontal-push',
  'push-up': 'horizontal-push',
  'cable-fly': 'horizontal-push',
  'assisted-dip': 'horizontal-push',
  'scapular-push-up': 'horizontal-push',
  'push-up-plus': 'horizontal-push',
  'close-grip-push-up': 'horizontal-push',
  'diamond-push-up': 'horizontal-push',
  'close-grip-bench': 'horizontal-push',

  'overhead-press': 'vertical-press',
  'front-raise': 'vertical-press',
  'arnold-press': 'vertical-press',
  'lateral-raise': 'vertical-press',
  'cable-lateral-raise': 'vertical-press',
  'upright-row': 'vertical-press',
  'pike-push-up': 'vertical-press',
  'wall-slide': 'vertical-press',
  'landmine-press': 'vertical-press',

  'lat-pulldown': 'vertical-pull',
  'pull-up': 'vertical-pull',
  'chin-up': 'vertical-pull',
  'straight-arm-pulldown': 'vertical-pull',
  'neutral-pulldown': 'vertical-pull',
  'dumbbell-pullover': 'vertical-pull',

  'chest-supported-row': 'row',
  'face-pull': 'row',
  'reverse-fly': 'row',
  'one-arm-row': 'row',
  'seated-cable-row': 'row',
  'band-pull-apart': 'row',
  'rear-delt-row': 'row',
  'dumbbell-shrug': 'row',

  'incline-curl': 'curl',
  'hammer-curl': 'curl',
  'barbell-curl': 'curl',
  'reverse-curl': 'curl',
  'preacher-curl': 'curl',
  'zottman-curl': 'curl',

  'cable-pushdown': 'triceps-extension',
  'overhead-extension': 'triceps-extension',
  'skull-crusher': 'triceps-extension',
  'incline-cable-extension': 'triceps-extension',
  'reverse-grip-pushdown': 'triceps-extension',
  'single-arm-pushdown': 'triceps-extension',

  'goblet-squat': 'squat',
  'split-squat': 'squat',
  'narrow-leg-press': 'squat',
  'hack-squat': 'squat',
  'step-down': 'squat',
  'heel-elevated-squat': 'squat',
  'step-up': 'squat',
  'lateral-step-up': 'squat',
  'reverse-nordic': 'squat',

  'leg-extension': 'knee-extension',
  'terminal-knee-extension': 'knee-extension',

  'romanian-deadlift': 'hinge',
  'single-leg-hinge': 'hinge',
  'good-morning': 'hinge',
  'hip-thrust': 'hinge',
  'back-extension': 'hinge',

  'leg-curl': 'knee-flexion',
  'nordic-curl': 'knee-flexion',
  'seated-leg-curl': 'knee-flexion',
  'glute-ham-raise': 'knee-flexion',
  'lying-leg-curl': 'knee-flexion',
  'slider-curl': 'knee-flexion',

  'dead-bug': 'core',
  'front-plank': 'core',
  'cable-chop': 'core',
  'cable-crunch': 'core',
  'hanging-knee-raise': 'core',
  'side-plank': 'core',
  'hollow-hold': 'core',
  'bird-dog': 'core',
  'pallof-press': 'core',

  'suitcase-carry': 'carry',
  'farmer-carry': 'carry',

  'band-abduction': 'hip-abduction',
  clamshell: 'hip-abduction',
  'side-lying-abduction': 'hip-abduction',
  'balance-reach': 'hip-abduction',
  'monster-walk': 'hip-abduction',
  'hip-hike': 'hip-abduction',

  'standing-calf-raise': 'calf',
  'seated-calf-raise': 'calf',
  'single-leg-calf-raise': 'calf',
  'bent-knee-calf-raise': 'calf',
  'jump-rope': 'calf',
  'sled-push': 'calf',
};

const SUPPORTING_GROUPS: Record<MovementPattern, MuscleKey[]> = {
  'horizontal-push': ['chest', 'triceps', 'shoulders', 'core'],
  'vertical-press': ['shoulders', 'triceps', 'core'],
  'vertical-pull': ['lats', 'upper-back', 'biceps', 'core'],
  row: ['upper-back', 'lats', 'biceps'],
  curl: ['biceps'],
  'triceps-extension': ['triceps'],
  squat: ['quadriceps', 'glutes', 'core'],
  'knee-extension': ['quadriceps'],
  hinge: ['hamstrings', 'glutes', 'lower-back', 'core'],
  'knee-flexion': ['hamstrings', 'calves'],
  core: ['core', 'lower-back'],
  carry: ['upper-back', 'core', 'glutes'],
  'hip-abduction': ['glutes', 'core'],
  calf: ['calves'],
  isolation: [],
};

export function movementPatternForExercise(
  exercise: Pick<ExerciseTemplate, 'id'>,
): MovementPattern {
  return EXERCISE_PATTERNS[exercise.id] ?? 'isolation';
}

export function muscleHitsForExercise(
  exercise: Pick<ExerciseTemplate, 'id'>,
  primaryGroup: MuscleKey,
): MuscleKey[] {
  const pattern = movementPatternForExercise(exercise);
  return Array.from(new Set([primaryGroup, ...SUPPORTING_GROUPS[pattern]]));
}
