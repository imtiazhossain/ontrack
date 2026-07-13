import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, Screen } from '@/components/primitives';
import { CategoryBadge } from '@/components/shared';
import { findCategory } from '@/constants/categories';
import { spacing } from '@/design-system';
import { useSchedule } from '@/store/schedule';
import { formatDuration, formatMinutes } from '@/utils/date';
import { openSleepData } from '@/utils/open-sleep-data';

export default function SleepDetailScreen() {
  const router = useRouter();
  const { id: activityId } = useLocalSearchParams<{ id: string }>();
  const activity = useSchedule((state) =>
    state.activities.find((candidate) => candidate.id === activityId),
  );
  const categories = useSchedule((state) => state.categories);
  const setStatus = useSchedule((state) => state.setStatus);

  if (!activity) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">Sleep activity not found</AppText>
        <Button onPress={() => router.back()} accessibilityLabel="Go back">
          Go back
        </Button>
      </Screen>
    );
  }

  const category = findCategory(categories, activity.categoryId);
  const healthAppName = process.env.EXPO_OS === 'ios' ? 'Apple Health' : 'Health Connect';

  return (
    <Screen contentStyle={styles.screen}>
      <BackButton />
      <CategoryBadge category={category} />
      <AppText variant="title">{activity.title}</AppText>
      <AppText variant="callout" color="secondary">
        {formatMinutes(activity.startMinutes)} · {formatDuration(activity.durationMinutes)} planned
      </AppText>

      <Card variant="sunken" style={styles.healthCard}>
        <AppText variant="subheading">Your recorded sleep</AppText>
        <AppText variant="body" color="secondary">
          Review sleep duration, stages, and trends from your connected devices in {healthAppName}.
        </AppText>
        <Button
          size="lg"
          icon="heart.text.square.fill"
          onPress={() => void openSleepData()}
          accessibilityLabel={`Open sleep data in ${healthAppName}`}>
          Open sleep data
        </Button>
      </Card>

      <View style={styles.actions}>
        <Button
          variant="secondary"
          icon="pencil"
          onPress={() => router.push({ pathname: '/activity-form', params: { id: activity.id } })}
          accessibilityLabel={`Edit ${activity.title}`}>
          Edit sleep plan
        </Button>
        <Button
          variant="ghost"
          onPress={() =>
            setStatus(activity.id, activity.status === 'completed' ? 'upcoming' : 'completed')
          }
          accessibilityLabel="Toggle sleep complete">
          {activity.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
  healthCard: { gap: spacing.lg, marginTop: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
