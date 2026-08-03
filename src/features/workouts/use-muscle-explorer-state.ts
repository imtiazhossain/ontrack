import { useMemo, useState } from 'react';

import { resolveAtlasWorkoutSelection } from '@/features/workouts/atlas-workout-selection';
import {
  BODY_VIEW_TABS,
  DEFAULT_MUSCLE,
  musclesVisibleForBodyView,
} from '@/features/workouts/muscle-explorer-selection';
import {
  MUSCLE_ATLAS,
  MUSCLE_ATLAS_BY_ID,
  musclesInCategory,
  type MuscleAtlasCategoryId,
  type MuscleAtlasEntry,
} from '@/features/workouts/muscle-atlas';
import {
  MUSCLE_GROUPS_BY_KEY,
  MUSCLE_TARGETS_BY_GROUP,
  type AnatomySex,
  type BodyView,
  type MuscleKey,
} from '@/features/workouts/muscle-data';
import { MUSCLE_HIGHLIGHT_VIEW } from '@/features/workouts/muscle-highlight-images';
import { haptics } from '@/utils/haptics';

const DEFAULT_ATLAS_MUSCLE =
  MUSCLE_ATLAS_BY_ID['biceps-brachii'] ?? MUSCLE_ATLAS[0];

export function useMuscleExplorerState(onSelectionChange?: () => void) {
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [anatomySex, setAnatomySex] = useState<AnatomySex>('male');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleKey>(
    DEFAULT_ATLAS_MUSCLE.workoutGroup ?? 'biceps',
  );
  const [selectedTargetId, setSelectedTargetId] = useState(
    DEFAULT_ATLAS_MUSCLE.highlightId ?? MUSCLE_TARGETS_BY_GROUP.biceps[0].id,
  );
  const [atlasCategoryId, setAtlasCategoryId] = useState<MuscleAtlasCategoryId>(
    DEFAULT_ATLAS_MUSCLE.categoryId,
  );
  const [atlasMuscleId, setAtlasMuscleId] = useState(DEFAULT_ATLAS_MUSCLE.id);

  const muscleTargets = MUSCLE_TARGETS_BY_GROUP[selectedMuscle];
  const selectedTarget =
    muscleTargets.find((target) => target.id === selectedTargetId) ?? muscleTargets[0];
  const atlasMuscle = MUSCLE_ATLAS_BY_ID[atlasMuscleId] ?? DEFAULT_ATLAS_MUSCLE;
  const atlasSelection = useMemo(
    () => resolveAtlasWorkoutSelection(atlasMuscle),
    [atlasMuscle],
  );
  const focusExercises = atlasSelection.exercises.length
    ? atlasSelection.exercises
    : selectedTarget.exercises;
  const visibleMuscles = musclesVisibleForBodyView(bodyView);

  const noteChange = () => onSelectionChange?.();

  const applyAtlasMuscle = (muscle: MuscleAtlasEntry) => {
    setAtlasCategoryId(muscle.categoryId);
    setAtlasMuscleId(muscle.id);
    const selection = resolveAtlasWorkoutSelection(muscle);
    const highlightView =
      (selection.highlightMuscleId
        ? MUSCLE_HIGHLIGHT_VIEW[selection.highlightMuscleId]
        : undefined) ??
      (muscle.highlightId ? MUSCLE_HIGHLIGHT_VIEW[muscle.highlightId] : undefined) ??
      MUSCLE_HIGHLIGHT_VIEW[muscle.id];
    if (highlightView) {
      setBodyView(highlightView);
    } else if (muscle.visibility === 'front' || muscle.visibility === 'back') {
      setBodyView(muscle.visibility);
    } else if (muscle.workoutGroup) {
      setBodyView(MUSCLE_GROUPS_BY_KEY[muscle.workoutGroup].view);
    }
    if (muscle.workoutGroup) {
      setSelectedMuscle(muscle.workoutGroup);
      const targets = MUSCLE_TARGETS_BY_GROUP[muscle.workoutGroup];
      const matched =
        (selection.highlightMuscleId
          ? targets.find((target) => target.id === selection.highlightMuscleId)
          : undefined) ??
        (muscle.highlightId
          ? targets.find((target) => target.id === muscle.highlightId)
          : undefined) ??
        targets[0];
      if (matched) setSelectedTargetId(matched.id);
    }
    noteChange();
  };

  const changeAnatomySex = (next: AnatomySex) => {
    if (next === anatomySex) return;
    haptics.select();
    setAnatomySex(next);
  };

  const changeBodyView = (nextView: BodyView) => {
    if (nextView === bodyView) return;
    haptics.select();
    const nextMuscle = DEFAULT_MUSCLE[nextView];
    setBodyView(nextView);
    setSelectedMuscle(nextMuscle);
    setSelectedTargetId(MUSCLE_TARGETS_BY_GROUP[nextMuscle][0].id);
    const atlasMatch =
      MUSCLE_ATLAS.find(
        (entry) => entry.workoutGroup === nextMuscle && entry.visibility === nextView,
      ) ?? MUSCLE_ATLAS.find((entry) => entry.workoutGroup === nextMuscle);
    if (atlasMatch) {
      setAtlasCategoryId(atlasMatch.categoryId);
      setAtlasMuscleId(atlasMatch.id);
    }
    noteChange();
  };

  const selectMuscle = (key: MuscleKey) => {
    if (key === selectedMuscle) return;
    haptics.select();
    setSelectedMuscle(key);
    setSelectedTargetId(MUSCLE_TARGETS_BY_GROUP[key][0].id);
    const atlasMatch =
      MUSCLE_ATLAS.find(
        (entry) => entry.workoutGroup === key && entry.visibility === bodyView,
      ) ?? MUSCLE_ATLAS.find((entry) => entry.workoutGroup === key);
    if (atlasMatch) {
      setAtlasCategoryId(atlasMatch.categoryId);
      setAtlasMuscleId(atlasMatch.id);
    }
    noteChange();
  };

  /** Invisible hit-box tap on the anatomy JPG → show that plate + atlas row. */
  const selectMapHit = (hit: { key: MuscleKey; highlightId: string }) => {
    haptics.select();
    setSelectedMuscle(hit.key);
    setSelectedTargetId(hit.highlightId);
    const atlasMatch =
      MUSCLE_ATLAS.find((entry) => entry.highlightId === hit.highlightId) ??
      MUSCLE_ATLAS.find((entry) => entry.id === hit.highlightId) ??
      MUSCLE_ATLAS.find(
        (entry) => entry.workoutGroup === hit.key && entry.visibility === bodyView,
      ) ??
      MUSCLE_ATLAS.find((entry) => entry.workoutGroup === hit.key);
    if (atlasMatch) {
      setAtlasCategoryId(atlasMatch.categoryId);
      setAtlasMuscleId(atlasMatch.id);
    }
    noteChange();
  };

  const selectTarget = (targetId: string) => {
    if (targetId === selectedTarget.id) return;
    haptics.select();
    setSelectedTargetId(targetId);
    const atlasMatch =
      MUSCLE_ATLAS.find((entry) => entry.highlightId === targetId) ??
      MUSCLE_ATLAS.find((entry) => entry.id === targetId);
    if (atlasMatch) {
      setAtlasCategoryId(atlasMatch.categoryId);
      setAtlasMuscleId(atlasMatch.id);
    }
    noteChange();
  };

  const selectAtlasCategory = (categoryId: MuscleAtlasCategoryId) => {
    if (categoryId === atlasCategoryId) return;
    haptics.select();
    const first = musclesInCategory(categoryId)[0];
    if (!first) return;
    applyAtlasMuscle(first);
  };

  const selectAtlasMuscle = (muscle: MuscleAtlasEntry) => {
    if (muscle.id === atlasMuscleId) return;
    haptics.select();
    applyAtlasMuscle(muscle);
  };

  return {
    bodyView,
    anatomySex,
    selectedMuscle,
    selectedTarget,
    muscleTargets,
    atlasCategoryId,
    atlasMuscle,
    atlasSelection,
    focusExercises,
    visibleMuscles,
    bodyViewTabs: BODY_VIEW_TABS,
    changeAnatomySex,
    changeBodyView,
    selectMuscle,
    selectMapHit,
    selectTarget,
    selectAtlasCategory,
    selectAtlasMuscle,
  };
}
