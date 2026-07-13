import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Screen } from '@/components/primitives';
import { MonthGrid } from '@/features/calendar/month-grid';
import { layout, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useSchedule } from '@/store/schedule';
import { formatMonthTitle, fromDateKey, todayKey } from '@/utils/date';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const activities = useSchedule((state) => state.activities);
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, typeof activities> = {};
    for (const activity of activities) {
      (grouped[activity.date] ??= []).push(activity);
    }
    return grouped;
  }, [activities]);

  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => fromDateKey(today));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const dayCount = useMemo(
    () => (activitiesByDate[selected] ?? []).length,
    [activitiesByDate, selected],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setCursor(next);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Calendar</AppText>
        <Button variant="ghost" onPress={() => setSelected(todayKey())} accessibilityLabel="Jump to today">
          Today
        </Button>
      </View>

      <View style={styles.monthRow}>
        <IconButton
          icon="chevron.left"
          accessibilityLabel="Previous month"
          background="transparent"
          onPress={() => shiftMonth(-1)}
        />
        <AppText variant="subheading">{formatMonthTitle(year, month)}</AppText>
        <IconButton
          icon="chevron.right"
          accessibilityLabel="Next month"
          background="transparent"
          onPress={() => shiftMonth(1)}
        />
      </View>

      <MonthGrid
        year={year}
        month={month}
        selected={selected}
        activitiesByDate={activitiesByDate}
        onSelect={setSelected}
      />

      <View style={[styles.summary, { backgroundColor: theme.backgroundSunken }]}>
        <AppText variant="callout" color="secondary">
          {dayCount === 0
            ? 'No activities planned for this day.'
            : `${dayCount} ${dayCount === 1 ? 'activity' : 'activities'} planned`}
        </AppText>
        <Button
          onPress={() => router.push({ pathname: '/day/[date]', params: { date: selected } })}
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
