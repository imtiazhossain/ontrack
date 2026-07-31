import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText, Button, Card, SectionHeader, Symbol } from '@/components/primitives';
import { layout, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import type { Activity, Workout } from '@/types/models';
import { formatDuration, formatMinutes } from '@/utils/date';

export function WorkoutTodayPlan({
  todaysWorkouts,
  gymColors,
  savedMessage,
  onOpenCustomPlanner,
}: {
  todaysWorkouts: { activity: Activity; workout: Workout }[];
  gymColors: { main: string; tint: string };
  savedMessage?: string;
  onOpenCustomPlanner: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.pagePadding}>
      <SectionHeader title="Today’s Plan" detail={`${todaysWorkouts.length} Scheduled`} />
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
        onPress={onOpenCustomPlanner}
        accessibilityLabel="Open the custom workout editor">
        Plan from scratch
      </Button>

      <AppText variant="caption" color="tertiary" align="center" style={styles.disclaimer}>
        Exercise ideas are general education, not medical advice. Stop if a movement causes pain.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pagePadding: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  flex: { flex: 1 },
  emptyPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planList: { gap: spacing.sm },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  smallIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  savedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  disclaimer: {
    paddingHorizontal: spacing.md,
  },
});
