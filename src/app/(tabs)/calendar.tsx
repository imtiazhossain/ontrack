import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Screen } from '@/components/primitives';
import { isActivityEnabled } from '@/addons/registry';
import { MonthGrid } from '@/features/calendar/month-grid';
import { layout, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useAddons } from '@/store/addons';
import { useSchedule } from '@/store/schedule';
import { useUI } from '@/store/ui';
import { formatMonthTitle, fromDateKey, toDateKey, todayKey } from '@/utils/date';
import { AgentUiIds } from '@/utils/agent-ui';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const activities = useSchedule((state) => state.activities);
  const enabledAddons = useAddons((state) => state.enabled);
  const selectedDate = useUI((state) => state.selectedDate);
  const setSelectedDate = useUI((state) => state.setSelectedDate);
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, typeof activities> = {};
    for (const activity of activities) {
      if (!isActivityEnabled(activity, enabledAddons)) continue;
      (grouped[activity.date] ??= []).push(activity);
    }
    return grouped;
  }, [activities, enabledAddons]);

  const today = todayKey();
  const selected = selectedDate;
  const cursor = fromDateKey(selectedDate);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const dayCount = useMemo(
    () => (activitiesByDate[selected] ?? []).length,
    [activitiesByDate, selected],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setSelectedDate(toDateKey(next));
  };

  const openDay = () => {
    setSelectedDate(selected);
    router.navigate('/(tabs)');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Calendar</AppText>
        <Button
          variant="ghost"
          onPress={() => setSelectedDate(today)}
          testID={AgentUiIds.calendar.jumpToday}
          accessibilityLabel="Jump to today">
          Today
        </Button>
      </View>

      <View style={styles.monthRow}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Previous month"
          testID={AgentUiIds.calendar.prevMonth}
          background="transparent"
          onPress={() => shiftMonth(-1)}
        />
        <AppText variant="subheading">{formatMonthTitle(year, month)}</AppText>
        <IconButton
          icon="chevron-right"
          accessibilityLabel="Next month"
          testID={AgentUiIds.calendar.nextMonth}
          background="transparent"
          onPress={() => shiftMonth(1)}
        />
      </View>

      <MonthGrid
        year={year}
        month={month}
        selected={selected}
        activitiesByDate={activitiesByDate}
        onSelect={setSelectedDate}
      />

      <View style={[styles.summary, { backgroundColor: theme.backgroundSunken }]}>
        <AppText variant="callout" color="secondary">
          {dayCount === 0
            ? 'No activities planned for this day.'
            : `${dayCount} ${dayCount === 1 ? 'activity' : 'activities'} planned`}
        </AppText>
        <Button
          onPress={openDay}
          testID={AgentUiIds.calendar.openDay}
          accessibilityLabel="Open day">
          Open day
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  summary: {
    marginTop: spacing.xl,
    padding: layout.screenPadding,
    borderRadius: 16,
    gap: spacing.md,
  },
});
