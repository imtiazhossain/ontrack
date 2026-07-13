import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Screen, SectionHeader } from '@/components/primitives';
import { MetricDisplay } from '@/components/shared';
import { categoryColors, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useSchedule } from '@/store/schedule';
import { addDays, todayKey } from '@/utils/date';
import { dayCompletion, streak } from '@/utils/completion';

export default function InsightsScreen() {
  const theme = useTheme();
  const activities = useSchedule((state) => state.activities);
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, typeof activities> = {};
    for (const activity of activities) {
      (grouped[activity.date] ??= []).push(activity);
    }
    return grouped;
  }, [activities]);
  const workouts = useSchedule((s) => s.workouts);
  const meals = useSchedule((s) => s.meals);

  const today = todayKey();

  const stats = useMemo(() => {
    const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i));
    const weekActivities = weekKeys.flatMap((k) => activitiesByDate[k] ?? []);
    const weekCounted = weekActivities.filter((a) => a.status !== 'skipped');
    const weekCompletion =
      weekCounted.length === 0
        ? 0
        : weekCounted.reduce((sum, a) => sum + (a.status === 'completed' ? 1 : a.status === 'partial' ? 0.5 : 0), 0) /
          weekCounted.length;

    const todayActivities = activitiesByDate[today] ?? [];
    const completedToday = todayActivities.filter((a) => a.status === 'completed').length;

    return {
      todayCompletion: Math.round(dayCompletion(todayActivities) * 100),
      weekCompletion: Math.round(weekCompletion * 100),
      currentStreak: streak(activitiesByDate, today, addDays),
      completedToday,
      workoutCount: workouts.length,
      mealCount: meals.length,
    };
  }, [activitiesByDate, meals.length, today, workouts.length]);

  return (
    <Screen>
      <AppText variant="title" style={styles.title}>
        Insights
      </AppText>
      <AppText variant="body" color="secondary" style={styles.subtitle}>
        Patterns from your tracked week — estimates, not judgments.
      </AppText>

      <SectionHeader title="Overview" />
      <View style={styles.row}>
        <MetricDisplay label="Today" value={`${stats.todayCompletion}%`} detail={`${stats.completedToday} completed`} accent={theme.accentPrimary} />
        <MetricDisplay label="This week" value={`${stats.weekCompletion}%`} detail="7-day average" />
      </View>

      <View style={styles.row}>
        <MetricDisplay label="Streak" value={`${stats.currentStreak}d`} detail="Days above 50% completion" accent={theme.success} />
        <MetricDisplay label="Meals logged" value={`${stats.mealCount}`} detail="Recorded meals" />
      </View>

      <SectionHeader title="Training" />
      <MetricDisplay label="Workouts" value={`${stats.workoutCount}`} detail="Sessions in your history" accent={categoryColors(theme, 'gym').main} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});
