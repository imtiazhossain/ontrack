import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText, BackButton, Button, Screen, SectionHeader } from '@/components/primitives';
import { findCategory } from '@/constants/categories';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useSchedule } from '@/store/schedule';

export default function WorkDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const activityId = params.id;

  const activity = useSchedule((s) => s.activities.find((a) => a.id === activityId));
  const session = useSchedule((s) => s.workSessions.find((w) => w.activityId === activityId));
  const categories = useSchedule((s) => s.categories);
  const upsertWorkSession = useSchedule((s) => s.upsertWorkSession);

  if (!activity) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">Work session not found</AppText>
        <Button onPress={() => router.back()} accessibilityLabel="Go back">
          Go back
        </Button>
      </Screen>
    );
  }

  const category = findCategory(categories, activity.categoryId);
  const tasks = session?.tasks ?? [];

  const toggleTask = (taskId: string) => {
    if (!session) return;
    upsertWorkSession({
      ...session,
      tasks: tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    });
  };

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <Screen>
      <BackButton />
      <AppText variant="overline" color="tertiary">
        {category.name}
      </AppText>
      <AppText variant="title">{activity.title}</AppText>
      <AppText variant="body" color="secondary">
        {doneCount} of {tasks.length} tasks complete · {session?.focusMinutes ?? 0}m focus logged
      </AppText>
      <Button
        variant="secondary"
        icon="pencil"
        style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
        onPress={() => router.push({ pathname: '/activity-form', params: { id: activity.id } })}
        accessibilityLabel="Edit work session">
        Edit work session
      </Button>

      <SectionHeader title="Tasks" />
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={task.title}
          onPress={() => toggleTask(task.id)}
          style={[
            styles.taskRow,
            {
              backgroundColor: theme.backgroundSunken,
              borderColor: task.done ? theme.success : theme.separator,
            },
          ]}>
          <AppText variant="callout" color={task.done ? 'secondary' : 'primary'}>
            {task.done ? '✓ ' : ''}
            {task.title}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {task.priority}
          </AppText>
        </Pressable>
      ))}

      <Button variant="ghost" onPress={() => router.back()} accessibilityLabel="Close">
        Close
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  taskRow: {
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.xxs,
  },
});
