import {
  MUSCLE_TARGETS_BY_GROUP,
  MUSCLE_GROUPS_BY_KEY,
  type ExerciseTemplate,
  type MuscleKey,
  type MuscleTarget,
} from './muscle-data';
import type { MuscleAtlasEntry } from './muscle-atlas';
import { hasHighlightImage } from './muscle-highlight-images';

export interface AtlasWorkoutSelection {
  muscle: MuscleAtlasEntry;
  groupKey?: MuscleKey;
  groupLabel: string;
  target?: MuscleTarget;
  /** Id used to pick the pre-rendered glow plate (when available). */
  highlightMuscleId?: string;
  /** True when we only have a nearby regional plate, not an exact muscle art. */
  highlightIsProxy: boolean;
  functionText: string;
  exercises: ExerciseTemplate[];
}

function firstAvailableHighlight(ids: Array<string | undefined>): string | undefined {
  return ids.find((id) => id != null && hasHighlightImage(id));
}

/** Resolve training suggestions + highlight plate for an atlas muscle selection. */
export function resolveAtlasWorkoutSelection(
  muscle: MuscleAtlasEntry,
): AtlasWorkoutSelection {
  const groupKey = muscle.workoutGroup;
  const group = groupKey ? MUSCLE_GROUPS_BY_KEY[groupKey] : undefined;
  const targets = groupKey ? MUSCLE_TARGETS_BY_GROUP[groupKey] : [];
  const target =
    targets.find((item) => item.id === muscle.highlightId) ??
    (hasHighlightImage(muscle.id)
      ? targets.find((item) => item.id === muscle.id)
      : undefined) ??
    targets[0];

  const highlightMuscleId = firstAvailableHighlight([
    muscle.highlightId,
    muscle.id,
  ]);

  return {
    muscle,
    groupKey,
    groupLabel: group?.label ?? 'General',
    target,
    highlightMuscleId,
    highlightIsProxy: false,
    exercises: target?.exercises ?? group?.exercises ?? [],
    functionText: muscle.function,
  };
}
