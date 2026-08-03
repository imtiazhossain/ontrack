import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import type { resolveAtlasWorkoutSelection } from '@/features/workouts/atlas-workout-selection';
import { formatMuscleLabel } from '@/features/workouts/format-muscle-label';
import type { MuscleAtlasEntry } from '@/features/workouts/muscle-atlas';
import type { ExerciseTemplate, MuscleTarget } from '@/features/workouts/muscle-data';
import { useTheme } from '@/hooks/use-theme';

type AtlasSelection = ReturnType<typeof resolveAtlasWorkoutSelection>;

export function MuscleSummaryPanel({
  atlasMuscle,
  atlasSelection,
  muscleTargets,
  selectedTarget,
  focusExercises,
  gymColors,
  onSelectTarget,
}: {
  atlasMuscle: MuscleAtlasEntry;
  atlasSelection: AtlasSelection;
  muscleTargets: MuscleTarget[];
  selectedTarget: MuscleTarget;
  focusExercises: ExerciseTemplate[];
  gymColors: { main: string; tint: string };
  onSelectTarget: (targetId: string) => void;
}) {
  const theme = useTheme();

  return (
    <Animated.View key={atlasMuscle.id} entering={FadeInDown.duration(260)}>
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
                onPress={() => onSelectTarget(target.id)}
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
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  anatomyTagLabel: { flexShrink: 1 },
  targetRadio: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 9,
  },
  coachingCue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
