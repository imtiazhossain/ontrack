import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Screen } from '@/components/primitives';
import { CategoryBadge } from '@/components/shared';
import { findCategory } from '@/constants/categories';
import { spacing } from '@/design-system';
import { useSchedule } from '@/store/schedule';
import { formatDuration, formatMinutes } from '@/utils/date';

export default function GenericDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const activityId = params.id;

  const activity = useSchedule((s) => s.activities.find((a) => a.id === activityId));
  const categories = useSchedule((s) => s.categories);
  const setStatus = useSchedule((s) => s.setStatus);

  if (!activity) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">Activity not found</AppText>
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
      <CategoryBadge category={category} />
      <AppText variant="title" style={styles.title}>
        {activity.title}
      </AppText>
      <AppText variant="callout" color="secondary">
        {formatMinutes(activity.startMinutes)} · {formatDuration(activity.durationMinutes)}
      </AppText>
      <Button
        variant="secondary"
        icon="pencil"
        style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
        onPress={() => router.push({ pathname: '/activity-form', params: { id: activity.id } })}
        accessibilityLabel={`Edit ${activity.title}`}>
        Edit event
      </Button>

      {activity.summary ? (
        <AppText variant="body" color="secondary" style={styles.summary}>
          {activity.summary}
        </AppText>
      ) : null}

      {activity.notes ? (
        <View style={styles.notes}>
          <AppText variant="overline" color="tertiary">
            Notes
          </AppText>
          <AppText variant="body">{activity.notes}</AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          onPress={() =>
            setStatus(activity.id, activity.status === 'completed' ? 'upcoming' : 'completed')
          }
          accessibilityLabel="Toggle complete">
          {activity.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
        </Button>
        <Button variant="ghost" onPress={() => router.back()} accessibilityLabel="Close">
          Close
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md, marginBottom: spacing.xs },
  summary: { marginTop: spacing.lg },
  notes: { marginTop: spacing.xl, gap: spacing.sm },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
