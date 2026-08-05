import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing, layout } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { TodoFilter } from './todo-sort';

const QUICK_START_TASKS = [
  'Plan tomorrow',
  'Take a movement break',
  'Call someone I care about',
] as const;

export function TodoEmptyState({
  filter,
  hasTasks,
  onAddSuggestion,
  onFocusComposer,
  onShowCompleted,
}: {
  filter: TodoFilter;
  hasTasks: boolean;
  onAddSuggestion: (title: string) => void;
  onFocusComposer: () => void;
  onShowCompleted: () => void;
}) {
  const theme = useTheme();
  const { s } = useResponsive();

  if (filter === 'completed') {
    return (
      <View style={styles.empty}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: theme.backgroundSunken },
          ]}
        >
          <Symbol
            name="status-completed"
            size={24}
            color={theme.textTertiary}
          />
        </View>
        <AppText
          variant="heading"
          style={{ fontSize: s(21), lineHeight: s(26) }}>
          A clean slate
        </AppText>
        <AppText
          variant="body"
          color="secondary"
          align="center"
          style={[
            styles.emptyBody,
            { fontSize: s(14), lineHeight: s(20) },
          ]}>
          Completed tasks will collect here when you’re ready to look back.
        </AppText>
      </View>
    );
  }

  if (hasTasks) {
    return (
      <View style={styles.empty}>
        <View
          style={[styles.emptyIcon, { backgroundColor: theme.accentFaint }]}
        >
          <Symbol name="status-completed" size={24} color={theme.success} />
        </View>
        <AppText
          variant="heading"
          style={{ fontSize: s(21), lineHeight: s(26) }}>
          All caught up
        </AppText>
        <AppText
          variant="body"
          color="secondary"
          align="center"
          style={[
            styles.emptyBody,
            { fontSize: s(14), lineHeight: s(20) },
          ]}>
          Enjoy the space you made—or add the next small thing.
        </AppText>
        <View style={styles.emptyActions}>
          <Pressable
            accessibilityRole="button"
            hitSlop={2}
            onPress={onShowCompleted}
            style={({ pressed }) => [
              styles.emptyAction,
              { backgroundColor: theme.backgroundSunken },
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="callout">View completed</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            hitSlop={2}
            onPress={onFocusComposer}
            style={({ pressed }) => [
              styles.emptyAction,
              { backgroundColor: theme.accentPrimary },
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="callout" color="onAccent">
              Add another
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentFaint }]}>
        <Symbol name="tasks" size={24} color={theme.accentPrimary} />
      </View>
      <AppText
        variant="heading"
        style={{ fontSize: s(21), lineHeight: s(26) }}>
        Your list is wide open
      </AppText>
      <AppText
        variant="body"
        color="secondary"
        align="center"
        style={[
          styles.emptyBody,
          { fontSize: s(14), lineHeight: s(20) },
        ]}>
        Start with one clear, kind commitment to yourself.
      </AppText>
      <View style={styles.suggestions}>
        {QUICK_START_TASKS.map((suggestion) => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            accessibilityLabel={`Add ${suggestion}`}
            onPress={() => onAddSuggestion(suggestion)}
            style={({ pressed }) => [
              styles.suggestion,
              {
                backgroundColor: theme.backgroundSunken,
                borderColor: theme.separator,
              },
              pressed && styles.pressed,
            ]}
          >
            <Symbol name="add" size={15} color={theme.accentPrimary} />
            <AppText variant="caption">{suggestion}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  emptyBody: {
    maxWidth: 340,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  emptyAction: {
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radii.pill,
  },
  suggestions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  suggestion: {
    minHeight: layout.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  pressed: { opacity: 0.62 },
});
