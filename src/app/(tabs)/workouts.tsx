import { useRouter } from 'expo-router';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText, LoadingBlock, Screen, Symbol } from '@/components/primitives';
import { categoryColors, fontFamilies, layout, radii, spacing } from '@/design-system';
import { resolveAtlasWorkoutSelection } from '@/features/workouts/atlas-workout-selection';
import type { ExerciseLoadKind } from '@/features/workouts/exercise-load';
import { ANATOMY_BEIGE } from '@/features/workouts/anatomy-art';
import { formatMuscleLabel } from '@/features/workouts/format-muscle-label';
import {
    MUSCLE_ATLAS,
    MUSCLE_ATLAS_BY_ID,
    musclesInCategory,
    type MuscleAtlasCategoryId,
    type MuscleAtlasEntry,
} from '@/features/workouts/muscle-atlas';
import { MuscleAtlasDropdowns } from '@/features/workouts/muscle-atlas-dropdowns';
import {
    EXERCISES_BY_ID,
    MUSCLE_GROUPS,
    MUSCLE_GROUPS_BY_KEY,
    MUSCLE_TARGETS_BY_GROUP,
    type AnatomySex,
    type BodyView,
    type ExerciseTemplate,
    type MuscleKey,
    type MuscleTarget,
} from '@/features/workouts/muscle-data';
import { MuscleFocusExercises } from '@/features/workouts/muscle-focus-exercises';
import { MUSCLE_HIGHLIGHT_VIEW } from '@/features/workouts/muscle-highlight-images';
import { WorkoutSessionBuilder } from '@/features/workouts/workout-session-builder';
import { WorkoutTodayPlan } from '@/features/workouts/workout-today-plan';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { newId, useSchedule } from '@/store/schedule';
import type { WorkoutExercise } from '@/types/models';
import { nowMinutes, todayKey } from '@/utils/date';
import { haptics } from '@/utils/haptics';

const DEFAULT_ATLAS_MUSCLE =
  MUSCLE_ATLAS_BY_ID['biceps-brachii'] ?? MUSCLE_ATLAS[0];

const HumanBodyMap = lazy(() =>
  import('@/features/workouts/human-body-map').then((mod) => ({ default: mod.HumanBodyMap })),
);
const ExerciseAnatomyDemo = lazy(() =>
  import('@/features/workouts/exercise-anatomy-demo').then((mod) => ({
    default: mod.ExerciseAnatomyDemo,
  })),
);

const DEFAULT_MUSCLE: Record<BodyView, MuscleKey> = {
  front: 'chest',
  back: 'upper-back',
  side: 'glutes',
};

const BODY_VIEW_TABS: { view: BodyView; label: string }[] = [
  { view: 'front', label: 'Front' },
  { view: 'side', label: 'Side' },
  { view: 'back', label: 'Back' },
];

function bodyViewLabel(view: BodyView) {
  switch (view) {
    case 'front':
      return 'Anterior';
    case 'back':
      return 'Posterior';
    case 'side':
      return 'Side';
  }
}

const HIGHLIGHT_COLOR = '#FF7A1F';

interface ExerciseSource {
  targetId: string;
  targetLabel: string;
  groupLabel: string;
}

interface ExercisePreview {
  exercise: ExerciseTemplate;
  primaryGroup: MuscleKey;
  primaryTarget: MuscleTarget;
}

/** Primary carousel section for workout planning. */
export default function WorkoutsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { s } = useResponsive();
  const titleSize = s(34);
  const titleControlSize = s(30);
  const date = todayKey();
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [anatomySex, setAnatomySex] = useState<AnatomySex>('male');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleKey>(
    DEFAULT_ATLAS_MUSCLE.workoutGroup ?? 'biceps',
  );
  const [selectedTargetId, setSelectedTargetId] = useState(
    DEFAULT_ATLAS_MUSCLE.highlightId ??
      MUSCLE_TARGETS_BY_GROUP.biceps[0].id,
  );
  const [atlasCategoryId, setAtlasCategoryId] = useState<MuscleAtlasCategoryId>(
    DEFAULT_ATLAS_MUSCLE.categoryId,
  );
  const [atlasMuscleId, setAtlasMuscleId] = useState(DEFAULT_ATLAS_MUSCLE.id);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedExerciseSources, setSelectedExerciseSources] = useState<
    Record<string, ExerciseSource>
  >({});
  const [exerciseLoadKind, setExerciseLoadKind] = useState<ExerciseLoadKind>('weighted');
  const [exercisePreview, setExercisePreview] = useState<ExercisePreview>();
  const [savedMessage, setSavedMessage] = useState<string>();

  const activities = useSchedule((state) => state.activities);
  const workouts = useSchedule((state) => state.workouts);
  const categories = useSchedule((state) => state.categories);
  const saveEvent = useSchedule((state) => state.saveEvent);

  const gymCategory = categories.find((category) => category.detailKind === 'gym');
  const gymColors = categoryColors(theme, 'gym');
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
  const visibleMuscles = MUSCLE_GROUPS.filter((group) => {
    if (bodyView === 'side') {
      // Side plate: groups that have side hit targets.
      return (
        group.key === 'chest' ||
        group.key === 'biceps' ||
        group.key === 'glutes' ||
        group.key === 'quadriceps' ||
        group.key === 'hamstrings'
      );
    }
    return group.view === bodyView;
  });

  const changeAnatomySex = (next: AnatomySex) => {
    if (next === anatomySex) return;
    haptics.select();
    setAnatomySex(next);
  };
  const selectedExercises = selectedExerciseIds
    .map((id) => EXERCISES_BY_ID[id])
    .filter((exercise): exercise is ExerciseTemplate => Boolean(exercise));
  const selectedSetCount = selectedExercises.reduce((total, exercise) => total + exercise.sets, 0);
  const estimatedDuration = Math.max(20, selectedExercises.length * 8);

  const todaysWorkouts = useMemo(() => {
    const workoutsByActivityId = new Map(workouts.map((workout) => [workout.activityId, workout]));
    return activities
      .filter((activity) => activity.date === date && workoutsByActivityId.has(activity.id))
      .sort((a, b) => a.startMinutes - b.startMinutes)
      .map((activity) => ({ activity, workout: workoutsByActivityId.get(activity.id)! }));
  }, [activities, date, workouts]);

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
    setSavedMessage(undefined);
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
    setSavedMessage(undefined);
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
    setSavedMessage(undefined);
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
    setSavedMessage(undefined);
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
    setSavedMessage(undefined);
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

  const toggleExercise = (exerciseId: string, source?: ExerciseSource) => {
    haptics.select();
    setSavedMessage(undefined);
    const removing = selectedExerciseIds.includes(exerciseId);
    setSelectedExerciseIds((current) =>
      removing
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId],
    );
    setSelectedExerciseSources((current) => {
      if (removing) {
        const remaining = { ...current };
        delete remaining[exerciseId];
        return remaining;
      }
      return {
        ...current,
        [exerciseId]: source ?? {
          targetId: atlasMuscle.id,
          targetLabel: atlasMuscle.name,
          groupLabel: atlasSelection.groupLabel,
        },
      };
    });
  };

  const openExercisePreview = (exercise: ExerciseTemplate) => {
    haptics.tap();
    setExercisePreview({
      exercise,
      primaryGroup: atlasSelection.groupKey ?? selectedMuscle,
      primaryTarget: atlasSelection.target ?? selectedTarget,
    });
  };

  const clearSelectedExercises = () => {
    setSelectedExerciseIds([]);
    setSelectedExerciseSources({});
  };

  const openCustomPlanner = () => {
    router.push({ pathname: '/activity-form', params: { date } });
  };

  const addWorkoutToToday = () => {
    if (!gymCategory || selectedExercises.length === 0) return;

    const muscleLabels = Array.from(
      new Set(
        selectedExerciseIds
          .map((exerciseId) => selectedExerciseSources[exerciseId]?.targetLabel)
          .filter((label): label is string => Boolean(label)),
      ),
    );
    const title =
      muscleLabels.length === 1
        ? `${muscleLabels[0]} workout`
        : muscleLabels.length === 2
          ? `${muscleLabels[0]} + ${muscleLabels[1]}`
          : 'Full-body workout';
    const workoutExercises: WorkoutExercise[] = selectedExercises.map((exercise) => ({
      id: newId('exercise'),
      name: exercise.name,
      icon: exercise.icon,
      restSeconds: exercise.restSeconds,
      sets: Array.from({ length: exercise.sets }, () => ({
        id: newId('set'),
        reps: exercise.reps,
        weightKg: 0,
        done: false,
      })),
    }));

    saveEvent({
      detailKind: 'gym',
      activity: {
        date,
        title,
        categoryId: gymCategory.id,
        startMinutes: nowMinutes(),
        durationMinutes: estimatedDuration,
        status: 'upcoming',
        summary: `${selectedExercises.length} exercise${selectedExercises.length === 1 ? '' : 's'} · ${estimatedDuration} min`,
      },
      workout: {
        activityId: 'draft',
        type: 'strength',
        name: title,
        exercises: workoutExercises,
      },
    });

    clearSelectedExercises();
    setSavedMessage(`${title} was added to today.`);
    haptics.success();
  };

  return (
    <Screen padded={false} contentStyle={styles.content}>
      <View style={styles.pagePadding}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <View style={[styles.eyebrowRow, { height: titleControlSize }]}>
              <View style={[styles.eyebrowLabelWrap, { height: titleControlSize }]}>
                <AppText
                  variant="overline"
                  color="accent"
                  fit
                  style={[
                    styles.eyebrowLabel,
                    {
                      fontSize: s(11),
                      lineHeight: s(13),
                      // Optical top-align with the pill/button.
                      marginTop: s(-1),
                    },
                  ]}>
                  Strength Studio
                </AppText>
              </View>
              <View style={styles.eyebrowActions}>
                <View
                  style={[
                    styles.schedulePill,
                    {
                      backgroundColor: gymColors.tint,
                      height: titleControlSize,
                    },
                  ]}>
                  <View style={[styles.scheduleDot, { backgroundColor: gymColors.main }]} />
                  <AppText variant="caption" color="secondary" fit>
                    {todaysWorkouts.length === 0 ? 'Plan is open' : `${todaysWorkouts.length} today`}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Plan a custom workout"
                  hitSlop={8}
                  onPress={openCustomPlanner}
                  style={({ pressed }) => [
                    styles.headerAction,
                    {
                      width: titleControlSize,
                      height: titleControlSize,
                      borderRadius: titleControlSize / 2,
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.separator,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <Symbol name="slider.horizontal.3" size="sm" color={theme.textPrimary} />
                </Pressable>
              </View>
            </View>
            <Text
              accessibilityRole="header"
              allowFontScaling={false}
              numberOfLines={2}
              style={[
                styles.titleText,
                {
                  color: theme.textPrimary,
                  fontSize: titleSize,
                  lineHeight: Math.round(titleSize * 1.12),
                },
              ]}>
              Build around your body.
            </Text>
            <AppText variant="body" color="secondary" style={styles.headerBody}>
              Explore the anatomy, choose a focus, and shape a session that feels intentional.
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.pagePadding}>
        <View style={styles.sectionIntro}>
          <AppText variant="overline" color="tertiary">Interactive Anatomy</AppText>
          <AppText variant="heading">Muscle Explorer</AppText>
        </View>

        <View
          style={[
            styles.bodyExperience,
            { backgroundColor: ANATOMY_BEIGE, borderColor: theme.separator },
          ]}>
          <View
            style={[
              styles.bodyChromeBar,
              {
                backgroundColor: ANATOMY_BEIGE,
              },
            ]}>
            <View style={styles.bodyChromeTopRow}>
              <View
                style={[
                  styles.sexToggle,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.separator,
                  },
                ]}>
                {([
                  { id: 'male' as const, label: 'Male' },
                  { id: 'female' as const, label: 'Female' },
                ]).map((option) => {
                  const selected = anatomySex === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${option.label} anatomy`}
                      accessibilityState={{ selected }}
                      hitSlop={4}
                      onPress={() => changeAnatomySex(option.id)}
                      style={[
                        styles.sexToggleTab,
                        selected && { backgroundColor: theme.backgroundSunken },
                      ]}>
                      <AppText
                        variant="caption"
                        color={selected ? 'primary' : 'secondary'}
                        fit>
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={[
                  styles.bodyViewDock,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.separator,
                  },
                ]}>
                {BODY_VIEW_TABS.map((tab) => {
                  const selected = bodyView === tab.view;
                  return (
                    <Pressable
                      key={tab.view}
                      accessibilityRole="tab"
                      accessibilityLabel={`${tab.label} body view`}
                      accessibilityState={{ selected }}
                      onPress={() => changeBodyView(tab.view)}
                      style={[
                        styles.bodyTab,
                        selected && { backgroundColor: theme.backgroundSunken },
                      ]}>
                      <AppText
                        variant="caption"
                        color={selected ? 'primary' : 'secondary'}
                        fit>
                        {tab.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.atlasControlsInline}>
              <MuscleAtlasDropdowns
                categoryId={atlasCategoryId}
                muscle={atlasMuscle}
                onSelectCategory={selectAtlasCategory}
                onSelectMuscle={selectAtlasMuscle}
              />
            </View>
          </View>

          <View style={styles.bodyMapStage}>
            <Suspense fallback={<LoadingBlock label="Loading anatomy…" />}>
              <HumanBodyMap
                anatomySex={anatomySex}
                bodyView={bodyView}
                selectedMuscle={selectedMuscle}
                selectedTarget={selectedTarget}
                highlightMuscleId={atlasSelection.highlightMuscleId}
                onSelectHit={selectMapHit}
              />
            </Suspense>
          </View>

          <View
            style={[
              styles.bodyCaption,
              {
                backgroundColor: theme.backgroundElevated,
                borderTopColor: theme.separator,
              },
            ]}>
            <View style={styles.bodyCaptionCopy}>
              <View style={styles.focusIndicator} />
              <View style={styles.flex}>
                <AppText variant="overline" color="tertiary">
                  {atlasSelection.groupLabel}
                </AppText>
                <AppText variant="subheading" numberOfLines={2}>
                  {formatMuscleLabel(atlasMuscle.name)}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color="tertiary">
              {bodyViewLabel(bodyView)} · {anatomySex === 'female' ? 'Female' : 'Male'}
              {atlasMuscle.visibility === 'deep' ? ' · Deep' : ''}
            </AppText>
          </View>
        </View>

        <ScrollView
          horizontal
          accessibilityRole="tablist"
          contentContainerStyle={styles.muscleChips}
          showsHorizontalScrollIndicator={false}>
          {visibleMuscles.map((group) => {
            const selected = group.key === selectedMuscle;
            return (
              <Pressable
                key={group.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => selectMuscle(group.key)}
                style={[
                  styles.muscleChip,
                  {
                    backgroundColor: selected ? gymColors.main : theme.backgroundElevated,
                    borderColor: selected ? gymColors.main : theme.separator,
                  },
                ]}>
                <AppText variant="callout" color={selected ? 'onAccent' : 'secondary'}>
                  {group.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Animated.View
        key={atlasMuscle.id}
        entering={FadeInDown.duration(260)}
        style={styles.pagePadding}>
        <View
          style={[
            styles.muscleSummary,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.separator,
            },
          ]}>
            <View style={styles.summaryHeader}>
            <View style={[styles.focusIcon, { backgroundColor: gymColors.tint }]}>
              <Symbol name="scope" size="lg" color={gymColors.main} />
            </View>
            <View style={styles.flex}>
              <AppText variant="overline" color="accent">Selected Muscle</AppText>
              <AppText variant="heading" numberOfLines={2}>
                {formatMuscleLabel(atlasMuscle.name)}
              </AppText>
            </View>
            <View style={[styles.exerciseCount, { backgroundColor: theme.backgroundSunken }]}>
              <AppText variant="caption" color="secondary">
                {focusExercises.length} Workout{focusExercises.length === 1 ? '' : 's'}
              </AppText>
            </View>
          </View>

          <View style={[styles.coachingCue, { backgroundColor: gymColors.tint }]}>
            <Symbol name="text.book.closed.fill" size="md" color={gymColors.main} />
            <View style={styles.flex}>
              <AppText variant="overline" color="accent">What It Does</AppText>
              <AppText variant="callout" color="secondary">
                {atlasSelection.functionText}
              </AppText>
            </View>
          </View>

          <View style={styles.targetPickerHeader}>
            <AppText variant="overline" color="tertiary">
              Related Training Targets
            </AppText>
          </View>
          <View style={styles.anatomyTags}>
            {muscleTargets.map((target) => {
              const selected = target.id === selectedTarget.id;
              return (
                <Pressable
                  key={target.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`Target ${formatMuscleLabel(target.label)}`}
                  accessibilityState={{ checked: selected }}
                  onPress={() => selectTarget(target.id)}
                  style={[
                    styles.anatomyTag,
                    {
                      backgroundColor: selected ? gymColors.tint : theme.backgroundPrimary,
                      borderColor: selected ? gymColors.main : theme.separator,
                    },
                  ]}>
                  <View
                    style={[
                      styles.targetRadio,
                      {
                        backgroundColor: selected ? gymColors.main : 'transparent',
                        borderColor: selected ? gymColors.main : theme.textTertiary,
                      },
                    ]}>
                    {selected ? (
                      <Symbol name="checkmark" size={10} color={theme.textOnAccent} />
                    ) : null}
                  </View>
                  <AppText
                    variant="caption"
                    color={selected ? 'primary' : 'secondary'}
                    numberOfLines={2}
                    style={styles.anatomyTagLabel}>
                    {formatMuscleLabel(target.label)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {selectedTarget.cue ? (
            <View style={[styles.coachingCue, { backgroundColor: theme.backgroundSunken }]}>
              <Symbol name="lightbulb.max.fill" size="md" color={gymColors.main} />
              <View style={styles.flex}>
                <AppText variant="overline" color="accent">Coach’s Cue</AppText>
                <AppText variant="callout" color="secondary">{selectedTarget.cue}</AppText>
              </View>
            </View>
          ) : null}
        </View>
      </Animated.View>

      <MuscleFocusExercises
        muscleLabel={formatMuscleLabel(atlasMuscle.name)}
        exercises={focusExercises}
        loadKind={exerciseLoadKind}
        selectedExerciseIds={selectedExerciseIds}
        accentTint={gymColors.tint}
        accentMain={gymColors.main}
        onChangeLoadKind={setExerciseLoadKind}
        onPreview={openExercisePreview}
        onToggle={(exerciseId) => toggleExercise(exerciseId)}
      />

      <WorkoutSessionBuilder
        selectedExercises={selectedExercises}
        selectedSetCount={selectedSetCount}
        estimatedDuration={estimatedDuration}
        onClear={clearSelectedExercises}
        onAddToToday={addWorkoutToToday}
      />

      <WorkoutTodayPlan
        todaysWorkouts={todaysWorkouts}
        gymColors={gymColors}
        savedMessage={savedMessage}
        onOpenCustomPlanner={openCustomPlanner}
      />

      <Suspense fallback={null}>
        <ExerciseAnatomyDemo
          anatomySex={anatomySex}
          exercise={exercisePreview?.exercise}
          primaryGroup={exercisePreview?.primaryGroup ?? selectedMuscle}
          primaryTarget={exercisePreview?.primaryTarget ?? selectedTarget}
          selected={exercisePreview
            ? selectedExerciseIds.includes(exercisePreview.exercise.id)
            : false}
          visible={Boolean(exercisePreview)}
          onClose={() => setExercisePreview(undefined)}
          onToggleSelected={() => {
            if (!exercisePreview) return;
            toggleExercise(exercisePreview.exercise.id, {
              targetId: exercisePreview.primaryTarget.id,
              targetLabel: exercisePreview.primaryTarget.label,
              groupLabel: MUSCLE_GROUPS_BY_KEY[exercisePreview.primaryGroup].label,
            });
          }}
        />
      </Suspense>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  pagePadding: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 0,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eyebrowActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
    gap: spacing.sm,
  },
  eyebrowLabelWrap: {
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
  },
  eyebrowLabel: {
    includeFontPadding: false,
    letterSpacing: 1.2,
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  scheduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleText: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.6,
    includeFontPadding: false,
  },
  headerBody: {
    maxWidth: 500,
  },
  headerAction: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    boxShadow: '0 4px 16px rgba(27, 24, 21, 0.08)',
  },
  sectionIntro: {
    gap: spacing.xxs,
  },
  bodyMapStage: {
    position: 'relative',
    width: '100%',
  },
  bodyChromeBar: {
    gap: spacing.sm,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  bodyChromeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sexToggle: {
    flexDirection: 'row',
    gap: 2,
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 2,
  },
  sexToggleTab: {
    minHeight: 30,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  bodyViewDock: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 2,
  },
  atlasControlsInline: {
    gap: spacing.sm,
  },
  bodyExperience: {
    overflow: 'hidden',
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radii.xl,
    boxShadow: '0 18px 45px rgba(54, 28, 20, 0.22)',
  },
  bodyTab: {
    minHeight: 30,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
  },
  bodyCaption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bodyCaptionCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  focusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: HIGHLIGHT_COLOR,
    boxShadow: '0 0 12px rgba(255, 122, 31, 0.85)',
  },
  muscleChips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xl,
  },
  muscleChip: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
  },
  muscleSummary: {
    gap: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    boxShadow: '0 8px 24px rgba(27, 24, 21, 0.06)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  focusIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  exerciseCount: {
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  targetPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anatomyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  anatomyTag: {
    maxWidth: '100%',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  anatomyTagLabel: {
    flexShrink: 1,
  },
  targetRadio: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 9,
  },
  targetDetail: {
    gap: spacing.md,
  },
  targetDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  targetMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    boxShadow: '0 0 10px rgba(180, 96, 47, 0.4)',
  },
  coachingCue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
