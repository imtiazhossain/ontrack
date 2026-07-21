import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Screen, SectionHeader } from '@/components/primitives';
import { MetricDisplay } from '@/components/shared';
import { categoryColors, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useSchedule } from '@/store/schedule';
import { useNutrition } from '@/store/nutrition';
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
  const activeProfileId = useNutrition((s) => s.activeProfileId);
  const targetVersions = useNutrition((s) => s.targetVersions);

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

    const todayActivityIds = new Set(todayActivities.map((activity) => activity.id));
    const todayMeals = meals.filter((meal) => todayActivityIds.has(meal.activityId));
    const nutrition = todayMeals.reduce((totals, meal) => ({
      calories: totals.calories + meal.items.reduce((sum, item) => sum + item.calories, 0),
      proteinG: totals.proteinG + meal.items.reduce((sum, item) => sum + item.proteinG, 0),
      carbsG: totals.carbsG + meal.items.reduce((sum, item) => sum + item.carbsG, 0),
      fatG: totals.fatG + meal.items.reduce((sum, item) => sum + item.fatG, 0),
      fiberG: totals.fiberG + meal.items.reduce((sum, item) => sum + (item.fiberG ?? 0), 0),
      knownSodium: totals.knownSodium + meal.items.filter((item) => item.sodiumMg !== undefined).length,
      itemCount: totals.itemCount + meal.items.length,
    }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, knownSodium: 0, itemCount: 0 });

    return {
      todayCompletion: Math.round(dayCompletion(todayActivities) * 100),
      weekCompletion: Math.round(weekCompletion * 100),
      currentStreak: streak(activitiesByDate, today, addDays),
      completedToday,
      workoutCount: workouts.length,
      mealCount: meals.length,
      nutrition,
    };
  }, [activitiesByDate, meals, today, workouts.length]);

  const activeTarget = targetVersions
    .filter((version) => version.profileId === activeProfileId && version.status === 'approved')
    .sort((a, b) => b.version - a.version)[0]?.targets;

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

      <SectionHeader title="Today’s nutrition" />
      <View style={styles.row}>
        <MetricDisplay label="Calories" value={`${stats.nutrition.calories}`} detail={activeTarget ? `of ${activeTarget.calories} target` : 'No active target'} />
        <MetricDisplay label="Protein" value={`${stats.nutrition.proteinG}g`} detail={activeTarget ? `of ${activeTarget.proteinG}g target` : 'Known values'} accent={theme.accentPrimary} />
      </View>
      <View style={styles.row}>
        <MetricDisplay label="Carbs" value={`${stats.nutrition.carbsG}g`} detail={activeTarget ? `of ${activeTarget.carbsG}g target` : 'Known values'} />
        <MetricDisplay label="Fat" value={`${stats.nutrition.fatG}g`} detail={activeTarget ? `of ${activeTarget.fatG}g target` : 'Known values'} />
      </View>
      <MetricDisplay
        label="Nutrient coverage"
        value={stats.nutrition.itemCount ? `${Math.round(stats.nutrition.knownSodium / stats.nutrition.itemCount * 100)}%` : '—'}
        detail="Items with known sodium; unknown values are not counted as zero"
      />
      {activeTarget && stats.nutrition.proteinG < activeTarget.proteinG * 0.5 ? (
        <AppText variant="caption" color="secondary" style={styles.suggestion}>
          If it suits your preferences, a protein-containing snack could help move toward today’s target.
        </AppText>
      ) : null}
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
  suggestion: { marginTop: spacing.md, marginBottom: spacing.lg },
});
