import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, EmptyState, IconButton } from '@/components/primitives';
import { ActivityCard } from '@/components/shared';
import { findCategory } from '@/constants/categories';
import { layout, shadows, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { aiProvider } from '@/services/ai';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import type { Activity } from '@/types/models';
import { addDays, isToday, nowMinutes } from '@/utils/date';
import { confirmDeleteActivity, showActivityActions, type ActivityAction } from '@/utils/activity-actions';

interface DayViewProps {
  date: string;
  onChangeDate: (date: string) => void;
  /** Rendered above the timeline (the DayHeader) */
  renderHeader: (args: {
    completion: number;
    nowLine?: string;
    summaryLine?: string;
    topInset: number;
  }) => React.ReactNode;
}

function computeNowLine(activities: Activity[], date: string): string | undefined {
  if (!isToday(date)) return undefined;
  const now = nowMinutes();
  const current = activities.find(
    (a) => a.status === 'upcoming' && a.startMinutes <= now && now < a.startMinutes + a.durationMinutes,
  );
  if (current) return `Now · ${current.title}`;
  const next = activities.find((a) => a.status === 'upcoming' && a.startMinutes > now);
  if (next) return `Next · ${next.title}`;
  return undefined;
}

export function DayView({ date, onChangeDate, renderHeader }: DayViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const aiEnabled = usePreferences((s) => s.aiEnabled);

  const allActivities = useSchedule((s) => s.activities);
  const activities = useMemo(
    () =>
      allActivities
        .filter((activity) => activity.date === date)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [allActivities, date],
  );
  const categories = useSchedule((s) => s.categories);
  const setStatus = useSchedule((s) => s.setStatus);
  const deleteActivity = useSchedule((s) => s.deleteActivity);
  const duplicateActivity = useSchedule((s) => s.duplicateActivity);
  const moveActivityToDate = useSchedule((s) => s.moveActivityToDate);

  const completion = useMemo(() => {
    const counted = activities.filter((a) => a.status !== 'skipped');
    if (counted.length === 0) return 0;
    return (
      counted.reduce(
        (sum, a) => sum + (a.status === 'completed' ? 1 : a.status === 'partial' ? 0.5 : 0),
        0,
      ) / counted.length
    );
  }, [activities]);

  const completedCount = activities.filter((a) => a.status === 'completed').length;
  const skippedTitles = activities.filter((a) => a.status === 'skipped').map((a) => a.title);
  const nowLine = computeNowLine(activities, date);

  const [summary, setSummary] = useState<{ date: string; line: string } | undefined>();
  const canSummarize =
    aiEnabled && activities.length > 0 && date <= new Date().toISOString().slice(0, 10);
  useEffect(() => {
    let cancelled = false;
    if (!canSummarize) return;
    aiProvider
      .summarizeDay({
        dateKey: date,
        completed: completedCount,
        total: activities.filter((a) => a.status !== 'skipped').length,
        skippedTitles,
      })
      .then((s) => {
        if (!cancelled) setSummary({ date, line: `${s.headline} ${s.body}` });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, completedCount, skippedTitles.length, canSummarize]);

  const summaryLine = canSummarize && summary?.date === date ? summary.line : undefined;

  const now = nowMinutes();
  const currentId = isToday(date)
    ? activities.find(
        (a) =>
          a.status === 'upcoming' && a.startMinutes <= now && now < a.startMinutes + a.durationMinutes,
      )?.id
    : undefined;

  const handleActivityAction = (activity: Activity, action: ActivityAction) => {
    switch (action) {
      case 'edit':
        router.push({ pathname: '/activity-form', params: { id: activity.id } });
        break;
      case 'skip':
        setStatus(activity.id, 'skipped');
        break;
      case 'unskip':
        setStatus(activity.id, 'upcoming');
        break;
      case 'duplicate':
        duplicateActivity(activity.id);
        break;
      case 'move-tomorrow':
        moveActivityToDate(activity.id, addDays(activity.date, 1));
        break;
      case 'delete':
        confirmDeleteActivity(activity.title, () => deleteActivity(activity.id));
        break;
    }
  };

  const toggleComplete = (activity: Activity) => {
    if (activity.status === 'completed') setStatus(activity.id, 'upcoming');
    else if (activity.status === 'skipped') setStatus(activity.id, 'upcoming');
    else setStatus(activity.id, 'completed');
  };

  const openActivity = (activity: Activity) => {
    const category = findCategory(categories, activity.categoryId);
    switch (category.detailKind) {
      case 'food':
        router.push({ pathname: '/detail/food/[id]', params: { id: activity.id } });
        break;
      case 'gym':
        router.push({ pathname: '/detail/gym/[id]', params: { id: activity.id } });
        break;
      case 'work':
        router.push({ pathname: '/detail/work/[id]', params: { id: activity.id } });
        break;
      case 'movie':
        router.push({ pathname: '/detail/movie/[id]', params: { id: activity.id } });
        break;
      case 'sleep':
        router.push({ pathname: '/detail/sleep/[id]', params: { id: activity.id } });
        break;
      default:
        router.push({ pathname: '/detail/generic/[id]', params: { id: activity.id } });
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + layout.tabBarInset + 80 }}>
        {renderHeader({ completion, nowLine, summaryLine, topInset: 0 })}

        <View style={styles.timeline}>
          {activities.length === 0 ? (
            <EmptyState
              icon="calendar.badge.plus"
              title="A blank page"
              message="Nothing planned for this day yet. Add your first activity to begin shaping it."
              actionLabel="Add activity"
              onAction={() => router.push({ pathname: '/activity-form', params: { date } })}
            />
          ) : (
            <>
              <AppText variant="overline" color="tertiary" style={styles.timelineLabel}>
                Timeline
              </AppText>
              {activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  category={findCategory(categories, activity.categoryId)}
                  isCurrent={activity.id === currentId}
                  index={index}
                  onPress={() => openActivity(activity)}
                  onLongPress={() =>
                    showActivityActions({
                      activity,
                      onAction: (action) => handleActivityAction(activity, action),
                    })
                  }
                  onToggleComplete={() => toggleComplete(activity)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.fab,
          shadows.raised,
          { bottom: insets.bottom + layout.tabBarInset + spacing.lg },
        ]}>
        <IconButton
          icon="plus"
          size={56}
          background={theme.accentPrimary}
          color={theme.textOnAccent}
          accessibilityLabel="Add activity"
          onPress={() => router.push({ pathname: '/activity-form', params: { date } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  timeline: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
  },
  timelineLabel: {
    marginBottom: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: layout.screenPadding,
    borderRadius: 28,
  },
});
