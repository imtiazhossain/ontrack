import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, BackButton, Button } from '@/components/primitives';
import { spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useSchedule } from '@/store/schedule';
import type { WorkoutExercise } from '@/types/models';
import { haptics } from '@/utils/haptics';

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const activityId = params.id;

  const activity = useSchedule((s) => s.activities.find((a) => a.id === activityId));
  const storedWorkout = useSchedule((s) => s.workouts.find((w) => w.activityId === activityId));
  const setStatus = useSchedule((s) => s.setStatus);
  const upsertWorkout = useSchedule((s) => s.upsertWorkout);

  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => storedWorkout?.exercises ?? []);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const persistExercises = useCallback(
    (next: WorkoutExercise[]) => {
      if (!storedWorkout) return;
      setExercises(next);
      upsertWorkout({
        ...storedWorkout,
        exercises: next,
        startedAt: storedWorkout.startedAt ?? new Date().toISOString(),
      });
    },
    [storedWorkout, upsertWorkout],
  );

  const current = exercises[exerciseIndex];
  const currentSet = current?.sets[setIndex];

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = setInterval(() => setRestSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [restSeconds]);

  const finish = (status: 'completed' | 'partial' = 'completed') => {
    if (activity) setStatus(activity.id, status);
    if (storedWorkout) {
      upsertWorkout({
        ...storedWorkout,
        exercises,
        finishedAt: new Date().toISOString(),
      });
    }
    router.back();
  };

  const completeSet = () => {
    if (!current || !storedWorkout) return;

    const nextExercises = exercises.map((exercise, ei) => {
      if (ei !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, si) => (si === setIndex ? { ...set, done: true } : set)),
      };
    });
    persistExercises(nextExercises);
    haptics.success();

    if (setIndex < current.sets.length - 1) {
      setSetIndex((i) => i + 1);
      setRestSeconds(current.restSeconds);
      return;
    }
    if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
      setRestSeconds(exercises[exerciseIndex + 1]?.restSeconds ?? 60);
      return;
    }
    finish('completed');
  };

  const elapsedLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${m}:${`${s}`.padStart(2, '0')}`;
  }, [elapsed]);

  if (!activity || !storedWorkout || !current || !currentSet) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}> 
        <BackButton />
        <AppText variant="title">Workout not found</AppText>
        <Button onPress={() => router.back()} accessibilityLabel="Go back">
          Go back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}> 
      <View style={styles.header}>
        <BackButton accessibilityLabel="Exit active workout" />
        <AppText variant="overline" color="tertiary">
          Active workout · {elapsedLabel}
        </AppText>
        <AppText variant="display">{current.name}</AppText>
        <AppText variant="callout" color="secondary">
          Set {setIndex + 1} of {current.sets.length}
        </AppText>
      </View>

      <View style={[styles.setCard, { backgroundColor: theme.backgroundSunken }]}>
        <AppText variant="metric">{currentSet.reps} reps</AppText>
        <AppText variant="title" color="secondary">
          {currentSet.weightKg > 0 ? `${currentSet.weightKg} kg` : 'Bodyweight'}
        </AppText>
        {current.previousBest ? (
          <AppText variant="caption" color="tertiary">
            Previous best · {current.previousBest}
          </AppText>
        ) : null}
      </View>

      {restSeconds > 0 ? (
        <View style={styles.rest}>
          <AppText variant="subheading" color="accent">
            Rest {restSeconds}s
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button size="lg" onPress={completeSet} accessibilityLabel="Complete set">
          Complete set
        </Button>
        <Button variant="ghost" onPress={() => finish('partial')} accessibilityLabel="Finish workout">
          Finish workout
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
  header: { gap: spacing.sm },
  setCard: {
    padding: spacing.xxl,
    borderRadius: 24,
    alignItems: 'center',
    gap: spacing.sm,
  },
  rest: { alignItems: 'center' },
  actions: { gap: spacing.sm, marginBottom: spacing.xl },
});
