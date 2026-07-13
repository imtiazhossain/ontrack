import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Screen, SectionHeader } from '@/components/primitives';
import { findCategory } from '@/constants/categories';
import { spacing } from '@/design-system';
import { aiProvider } from '@/services/ai';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import type { WorkoutRecommendation } from '@/types/models';

export default function GymDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const activityId = params.id;

  const activity = useSchedule((s) => s.activities.find((a) => a.id === activityId));
  const workout = useSchedule((s) => s.workouts.find((w) => w.activityId === activityId));
  const categories = useSchedule((s) => s.categories);
  const goal = usePreferences((s) => s.goal);
  const aiEnabled = usePreferences((s) => s.aiEnabled);

  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(aiEnabled);

  useEffect(() => {
    if (!aiEnabled) return;
    let cancelled = false;
    aiProvider
      .recommendWorkout({ goal, recentWorkoutNames: [workout?.name ?? ''] })
      .then((rec) => {
        if (!cancelled) setRecommendation(rec);
      })
      .finally(() => {
        if (!cancelled) setLoadingRec(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aiEnabled, goal, workout?.name]);

  if (!activity) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">Workout not found</AppText>
        <Button onPress={() => router.back()} accessibilityLabel="Go back">
          Go back
        </Button>
      </Screen>
    );
  }

  const category = findCategory(categories, activity.categoryId);

  return (
    <Screen>
      <BackButton />
      <AppText variant="overline" color="tertiary">
        {category.name}
      </AppText>
      <AppText variant="title">{workout?.name ?? activity.title}</AppText>
      <AppText variant="body" color="secondary">
        {workout?.exercises.length ?? 0} exercises planned
      </AppText>
      <Button
        variant="secondary"
        icon="pencil"
        style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
        onPress={() => router.push({ pathname: '/activity-form', params: { id: activity.id } })}
        accessibilityLabel="Edit workout">
        Edit workout
      </Button>

      <SectionHeader title="Exercises" />
      {(workout?.exercises ?? []).map((exercise) => (
        <View key={exercise.id} style={styles.exerciseRow}>
          <AppText variant="callout">{exercise.name}</AppText>
          <AppText variant="caption" color="secondary">
            {exercise.sets.length} sets · {exercise.restSeconds}s rest
          </AppText>
        </View>
      ))}

      {aiEnabled ? (
        <>
          <SectionHeader title="AI recommendation" />
          {loadingRec ? (
            <AppText variant="callout" color="secondary">
              Generating a sample recommendation…
            </AppText>
          ) : recommendation ? (
            <View style={styles.recBox}>
              <AppText variant="subheading">{recommendation.name}</AppText>
              <AppText variant="body" color="secondary">
                {recommendation.reason}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {recommendation.disclaimer}
              </AppText>
            </View>
          ) : null}
        </>
      ) : null}

      <Button
        onPress={() => router.push({ pathname: '/detail/gym-active/[id]', params: { id: activityId } })}
        accessibilityLabel="Start workout">
        Start workout
      </Button>
      <Button variant="ghost" onPress={() => router.back()} accessibilityLabel="Close">
        Close
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  exerciseRow: {
    marginBottom: spacing.md,
    gap: spacing.xxs,
  },
  recBox: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
