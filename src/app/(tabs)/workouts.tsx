import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AppText, Button, Card, Screen, SectionHeader, Symbol } from '@/components/primitives';
import { categoryColors, layout, radii, spacing } from '@/design-system';
import { ExerciseAnatomyDemo } from '@/features/workouts/exercise-anatomy-demo';
import { HumanBodyMap } from '@/features/workouts/human-body-map';
import {
  EXERCISES_BY_ID,
  MUSCLE_GROUPS,
  MUSCLE_GROUPS_BY_KEY,
  MUSCLE_TARGETS_BY_GROUP,
  type BodyView,
  type ExerciseTemplate,
  type MuscleKey,
  type MuscleTarget,
} from '@/features/workouts/muscle-data';
import { useTheme } from '@/hooks/use-theme';
import { newId, useSchedule } from '@/store/schedule';
import type { WorkoutExercise } from '@/types/models';
import { formatDuration, formatMinutes, nowMinutes, todayKey } from '@/utils/date';
import { haptics } from '@/utils/haptics';

const DEFAULT_MUSCLE: Record<BodyView, MuscleKey> = {
  front: 'chest',
  back: 'upper-back',
};

const HIGHLIGHT_COLOR = '#FFB266';

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
  const date = todayKey();
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleKey>('chest');
  const [selectedTargetId, setSelectedTargetId] = useState(
    MUSCLE_TARGETS_BY_GROUP.chest[0].id,
  );
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedExerciseSources, setSelectedExerciseSources] = useState<
    Record<string, ExerciseSource>
  >({});
  const [exercisePreview, setExercisePreview] = useState<ExercisePreview>();
  const [savedMessage, setSavedMessage] = useState<string>();

  const activities = useSchedule((state) => state.activities);
  const workouts = useSchedule((state) => state.workouts);
  const categories = useSchedule((state) => state.categories);
  const saveEvent = useSchedule((state) => state.saveEvent);

  const gymCategory = categories.find((category) => category.detailKind === 'gym');
  const gymColors = categoryColors(theme, 'gym');
  const muscleGroup = MUSCLE_GROUPS_BY_KEY[selectedMuscle];
  const muscleTargets = MUSCLE_TARGETS_BY_GROUP[selectedMuscle];
  const selectedTarget =
    muscleTargets.find((target) => target.id === selectedTargetId) ?? muscleTargets[0];
  const visibleMuscles = MUSCLE_GROUPS.filter((group) => group.view === bodyView);
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

  const changeBodyView = (nextView: BodyView) => {
    if (nextView === bodyView) return;
    haptics.select();
    const nextMuscle = DEFAULT_MUSCLE[nextView];
    setBodyView(nextView);
    setSelectedMuscle(nextMuscle);
    setSelectedTargetId(MUSCLE_TARGETS_BY_GROUP[nextMuscle][0].id);
    setSavedMessage(undefined);
  };

  const selectMuscle = (key: MuscleKey) => {
    if (key === selectedMuscle) return;
    haptics.select();
    setSelectedMuscle(key);
    setSelectedTargetId(MUSCLE_TARGETS_BY_GROUP[key][0].id);
    setSavedMessage(undefined);
  };

  const selectTarget = (targetId: string) => {
    if (targetId === selectedTarget.id) return;
    haptics.select();
    setSelectedTargetId(targetId);
    setSavedMessage(undefined);
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
          targetId: selectedTarget.id,
          targetLabel: selectedTarget.label,
          groupLabel: muscleGroup.label,
        },
      };
    });
  };

  const openExercisePreview = (exercise: ExerciseTemplate) => {
    haptics.tap();
    setExercisePreview({
      exercise,
      primaryGroup: selectedMuscle,
      primaryTarget: selectedTarget,
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
            <View style={styles.eyebrowRow}>
              <AppText variant="overline" color="accent">Strength studio</AppText>
              <View style={[styles.schedulePill, { backgroundColor: gymColors.tint }]}>
                <View style={[styles.scheduleDot, { backgroundColor: gymColors.main }]} />
                <AppText variant="caption" color="secondary">
                  {todaysWorkouts.length === 0 ? 'Plan is open' : `${todaysWorkouts.length} today`}
                </AppText>
              </View>
            </View>
            <View style={styles.titleRow}>
              <AppText variant="title" style={styles.title}>Build around your body.</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Plan a custom workout"
                hitSlop={8}
                onPress={openCustomPlanner}
                style={({ pressed }) => [
                  styles.headerAction,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.separator,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <Symbol name="slider.horizontal.3" size="md" color={theme.textPrimary} />
              </Pressable>
            </View>
            <AppText variant="body" color="secondary" style={styles.headerBody}>
              Explore the anatomy, choose a focus, and shape a session that feels intentional.
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.pagePadding}>
        <View style={styles.sectionIntro}>
          <View style={styles.flex}>
            <AppText variant="overline" color="tertiary">Interactive anatomy</AppText>
            <AppText variant="heading">Muscle explorer</AppText>
          </View>
          <View style={[styles.livePill, { borderColor: theme.separator }]}>
            <View style={[styles.liveDot, { backgroundColor: gymColors.main }]} />
            <AppText variant="caption" color="secondary">Tap to focus</AppText>
          </View>
        </View>

        <View
          style={[
            styles.bodyExperience,
            { backgroundColor: theme.backgroundSunken, borderColor: theme.separator },
          ]}>
          <View style={[styles.bodyToolbar, { backgroundColor: theme.backgroundElevated }]}>
            {(['front', 'back'] as const).map((view) => {
              const selected = bodyView === view;
              return (
                <Pressable
                  key={view}
                  accessibilityRole="tab"
                  accessibilityLabel={`${view} body view`}
                  accessibilityState={{ selected }}
                  onPress={() => changeBodyView(view)}
                  style={[
                    styles.bodyTab,
                    selected && { backgroundColor: theme.backgroundSunken },
                  ]}>
                  <Symbol
                    name={view === 'front' ? 'person.fill' : 'arrow.triangle.2.circlepath'}
                    size="sm"
                    color={selected ? theme.textPrimary : theme.textTertiary}
                  />
                  <AppText variant="callout" color={selected ? 'primary' : 'secondary'}>
                    {view === 'front' ? 'Anterior' : 'Posterior'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <HumanBodyMap
            bodyView={bodyView}
            selectedMuscle={selectedMuscle}
            selectedTarget={selectedTarget}
            onSelectMuscle={selectMuscle}
          />

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
                <AppText variant="overline" color="tertiary">{muscleGroup.label}</AppText>
                <AppText variant="subheading">{selectedTarget.label}</AppText>
              </View>
            </View>
            <AppText variant="caption" color="tertiary">
              {bodyView === 'front' ? 'Anterior' : 'Posterior'} · {visibleMuscles.length} regions
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
        key={selectedMuscle}
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
              <AppText variant="overline" color="accent">Selected muscle group</AppText>
              <AppText variant="heading">{muscleGroup.label}</AppText>
            </View>
            <View style={[styles.exerciseCount, { backgroundColor: theme.backgroundSunken }]}>
              <AppText variant="caption" color="secondary">
                {muscleTargets.length} muscle{muscleTargets.length === 1 ? '' : 's'}
              </AppText>
            </View>
          </View>

          <View style={styles.targetPickerHeader}>
            <AppText variant="overline" color="tertiary">Muscles in this group</AppText>
            <AppText variant="caption" color="secondary">Choose one to isolate</AppText>
          </View>
          <View style={styles.anatomyTags}>
            {muscleTargets.map((target) => {
              const selected = target.id === selectedTarget.id;
              return (
                <Pressable
                  key={target.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`Target ${target.label}`}
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
                  <AppText variant="caption" color={selected ? 'primary' : 'secondary'}>
                    {target.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Animated.View
            key={selectedTarget.id}
            entering={FadeInDown.duration(220)}
            style={styles.targetDetail}>
            <View style={styles.targetDetailHeader}>
              <View style={[styles.targetMarker, { backgroundColor: gymColors.main }]} />
              <View style={styles.flex}>
                <AppText variant="overline" color="accent">Targeting now</AppText>
                <AppText variant="subheading">{selectedTarget.label}</AppText>
              </View>
            </View>
            <AppText variant="callout" color="secondary">
              {selectedTarget.description}
            </AppText>
            <View style={[styles.coachingCue, { backgroundColor: gymColors.tint }]}>
              <Symbol name="lightbulb.max.fill" size="md" color={gymColors.main} />
              <View style={styles.flex}>
                <AppText variant="overline" color="accent">Coach’s cue</AppText>
                <AppText variant="callout" color="secondary">{selectedTarget.cue}</AppText>
              </View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      <View style={styles.pagePadding}>
        <SectionHeader
          title={`Target ${selectedTarget.label}`}
          detail={`${selectedTarget.exercises.length} focused exercises`}
        />
        <View style={styles.exerciseList}>
          {selectedTarget.exercises.map((exercise, index) => {
            const selected = selectedExerciseIds.includes(exercise.id);
            return (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor: selected ? gymColors.tint : theme.backgroundElevated,
                    borderColor: selected ? gymColors.main : theme.separator,
                  },
                ]}>
                <View style={styles.exerciseTopRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Watch ${exercise.name} anatomy animation`}
                    onPress={() => openExercisePreview(exercise)}
                    style={({ pressed }) => [
                      styles.exercisePreviewButton,
                      { opacity: pressed ? 0.72 : 1 },
                    ]}>
                    <View
                      style={[
                        styles.exerciseIndex,
                        { backgroundColor: selected ? gymColors.main : theme.backgroundSunken },
                      ]}>
                      {selected ? (
                        <Symbol name="checkmark" size="sm" color={theme.textOnAccent} />
                      ) : (
                        <AppText variant="mono" color="secondary">0{index + 1}</AppText>
                      )}
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="subheading">{exercise.name}</AppText>
                      <AppText variant="caption" color="secondary">{exercise.equipment}</AppText>
                    </View>
                    <View style={[styles.previewControl, { backgroundColor: theme.backgroundSunken }]}>
                      <Symbol name="play.fill" size={10} color={gymColors.main} />
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${exercise.name}`}
                    accessibilityState={{ checked: selected }}
                    hitSlop={6}
                    onPress={() => toggleExercise(exercise.id)}
                    style={({ pressed }) => [
                      styles.addControl,
                      {
                        backgroundColor: selected ? gymColors.main : theme.backgroundPrimary,
                        borderColor: selected ? gymColors.main : theme.separator,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}>
                    <Symbol
                      name={selected ? 'minus' : 'plus'}
                      size="sm"
                      color={selected ? theme.textOnAccent : theme.textPrimary}
                    />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View muscles worked by ${exercise.name}`}
                  onPress={() => openExercisePreview(exercise)}
                  style={({ pressed }) => [
                    styles.exerciseMeta,
                    { borderTopColor: theme.separator, opacity: pressed ? 0.72 : 1 },
                  ]}>
                  <View style={styles.metaItem}>
                    <Symbol name="square.stack.3d.up" size="sm" color={theme.textTertiary} />
                    <AppText variant="caption" color="secondary">{exercise.sets} sets</AppText>
                  </View>
                  <View style={styles.metaItem}>
                    <Symbol name="repeat" size="sm" color={theme.textTertiary} />
                    <AppText variant="caption" color="secondary">{exercise.reps} reps</AppText>
                  </View>
                  <View style={styles.metaItem}>
                    <Symbol name="timer" size="sm" color={theme.textTertiary} />
                    <AppText variant="caption" color="secondary">{exercise.restSeconds}s rest</AppText>
                  </View>
                  <View style={styles.watchHint}>
                    <AppText variant="caption" color="accent">Watch anatomy</AppText>
                    <Symbol name="chevron.right" size={10} color={gymColors.main} />
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {selectedExercises.length > 0 ? (
        <Animated.View entering={FadeInUp.duration(260)} style={styles.pagePadding}>
          <LinearGradient
            colors={['#35201D', '#1B1210']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.builder}>
            <View style={styles.builderHeader}>
              <View style={styles.flex}>
                <AppText variant="overline" style={styles.builderOverline}>Session builder</AppText>
                <AppText variant="heading" style={styles.builderTitle}>
                  Your workout is taking shape.
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear selected exercises"
                hitSlop={8}
                onPress={clearSelectedExercises}>
                <AppText variant="caption" style={styles.builderClear}>Clear</AppText>
              </Pressable>
            </View>

            <View style={styles.builderMetrics}>
              <View style={styles.builderMetric}>
                <AppText variant="metric" style={styles.builderMetricValue}>
                  {selectedExercises.length}
                </AppText>
                <AppText variant="caption" style={styles.builderMetricLabel}>Exercises</AppText>
              </View>
              <View style={styles.builderMetric}>
                <AppText variant="metric" style={styles.builderMetricValue}>{selectedSetCount}</AppText>
                <AppText variant="caption" style={styles.builderMetricLabel}>Working sets</AppText>
              </View>
              <View style={styles.builderMetric}>
                <AppText variant="metric" style={styles.builderMetricValue}>{estimatedDuration}</AppText>
                <AppText variant="caption" style={styles.builderMetricLabel}>Minutes</AppText>
              </View>
            </View>

            <AppText variant="caption" numberOfLines={2} style={styles.builderNames}>
              {selectedExercises.map((exercise) => exercise.name).join('  ·  ')}
            </AppText>
            <Button
              size="lg"
              icon="calendar-add"
              onPress={addWorkoutToToday}
              accessibilityLabel={`Add ${selectedExercises.length} exercises to today`}>
              Add workout to today
            </Button>
          </LinearGradient>
        </Animated.View>
      ) : null}

      <View style={styles.pagePadding}>
        <SectionHeader title="Today’s plan" detail={`${todaysWorkouts.length} scheduled`} />
        {todaysWorkouts.length === 0 ? (
          <Card variant="sunken" style={styles.emptyPlan}>
            <View style={[styles.smallIcon, { backgroundColor: gymColors.tint }]}>
              <Symbol name="calendar.badge.plus" size="md" color={gymColors.main} />
            </View>
            <View style={styles.flex}>
              <AppText variant="subheading">Your training window is open</AppText>
              <AppText variant="caption" color="secondary">
                Select movements above or use the custom planner.
              </AppText>
            </View>
            <Symbol name="arrow.up" size="sm" color={theme.textTertiary} />
          </Card>
        ) : (
          <View style={styles.planList}>
            {todaysWorkouts.map(({ activity, workout }) => (
              <Card
                key={activity.id}
                onPress={() =>
                  router.push({ pathname: '/detail/gym/[id]', params: { id: activity.id } })
                }
                accessibilityLabel={`Open ${activity.title}`}>
                <View style={styles.planRow}>
                  <View style={[styles.smallIcon, { backgroundColor: gymColors.tint }]}>
                    <Symbol name="dumbbell.fill" size="md" color={gymColors.main} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="subheading" numberOfLines={1}>{activity.title}</AppText>
                    <AppText variant="caption" color="secondary">
                      {formatMinutes(activity.startMinutes)} · {formatDuration(activity.durationMinutes)} · {workout.exercises.length} exercises
                    </AppText>
                  </View>
                  <Symbol name="chevron.right" size="sm" color={theme.textTertiary} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {savedMessage ? (
          <Animated.View
            entering={FadeInDown.duration(220)}
            accessible
            accessibilityRole="alert"
            style={[styles.savedMessage, { backgroundColor: theme.accentFaint }]}>
            <Symbol name="checkmark.circle.fill" size="md" color={theme.success} />
            <AppText variant="callout" color="success">{savedMessage}</AppText>
          </Animated.View>
        ) : null}

        <Button
          variant="secondary"
          icon="filter"
          onPress={openCustomPlanner}
          accessibilityLabel="Open the custom workout editor">
          Plan from scratch
        </Button>

        <AppText variant="caption" color="tertiary" align="center" style={styles.disclaimer}>
          Exercise ideas are general education, not medical advice. Stop if a movement causes pain.
        </AppText>
      </View>

      <ExerciseAnatomyDemo
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
    paddingTop: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  eyebrowRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  schedulePill: {
    minHeight: 28,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  headerBody: {
    maxWidth: 500,
  },
  headerAction: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 23,
    boxShadow: '0 4px 16px rgba(27, 24, 21, 0.08)',
  },
  sectionIntro: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  livePill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bodyExperience: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radii.xl,
    boxShadow: '0 18px 45px rgba(54, 28, 20, 0.22)',
  },
  bodyToolbar: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  bodyTab: {
    minHeight: 42,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
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
    boxShadow: '0 0 12px rgba(255, 178, 102, 0.85)',
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  anatomyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  anatomyTag: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
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
  exerciseList: {
    gap: spacing.md,
  },
  exerciseCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    boxShadow: '0 4px 18px rgba(27, 24, 21, 0.045)',
  },
  exerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exercisePreviewButton: {
    minHeight: layout.minTapTarget,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseIndex: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  addControl: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
  },
  previewControl: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  exerciseMeta: {
    minHeight: layout.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    paddingLeft: 54,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  watchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  builder: {
    gap: spacing.lg,
    overflow: 'hidden',
    borderRadius: radii.xl,
    padding: spacing.lg,
    boxShadow: '0 18px 38px rgba(40, 19, 14, 0.24)',
  },
  builderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  builderOverline: {
    color: '#E49579',
  },
  builderTitle: {
    color: '#FFF8F2',
  },
  builderClear: {
    color: '#C9B9B2',
  },
  builderMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  builderMetric: {
    flex: 1,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  builderMetricValue: {
    color: '#FFF8F2',
    fontVariant: ['tabular-nums'],
  },
  builderMetricLabel: {
    color: '#C9B9B2',
  },
  builderNames: {
    color: '#C9B9B2',
  },
  emptyPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planList: {
    gap: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  smallIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  savedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  disclaimer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
