import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton, ProgressRing } from '@/components/primitives';
import { layout, spacing, timeOfDayGradient } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDateLong, formatWeekday, isToday } from '@/utils/date';

interface DayHeaderProps {
  date: string;
  completion: number;
  /** e.g. "Now · Deep work" or "Next · Lunch" */
  nowLine?: string;
  summaryLine?: string;
  onChangeDate: (date: string) => void;
  topInset: number;
}

export function DayHeader({
  date,
  completion,
  nowLine,
  summaryLine,
  onChangeDate,
  topInset,
}: DayHeaderProps) {
  const theme = useTheme();
  const gradient = timeOfDayGradient(theme, isToday(date) ? new Date().getHours() : 12);

  return (
    <LinearGradient colors={gradient} style={[styles.container, { paddingTop: topInset + spacing.md }]}>
      <View style={styles.topRow}>
        <IconButton
          icon="chevron.left"
          accessibilityLabel="Previous day"
          onPress={() => onChangeDate(addDays(date, -1))}
          background="transparent"
        />
        <View style={styles.titleBlock}>
          <AppText variant="overline" color="tertiary" align="center">
            {isToday(date) ? 'Today' : formatWeekday(date)}
          </AppText>
          <AppText variant="title" align="center">
            {formatDateLong(date)}
          </AppText>
        </View>
        <IconButton
          icon="chevron.right"
          accessibilityLabel="Next day"
          onPress={() => onChangeDate(addDays(date, 1))}
          background="transparent"
        />
      </View>

      <View style={styles.progressRow}>
        <ProgressRing
          progress={completion}
          size={92}
          label={`${Math.round(completion * 100)}%`}
          sublabel="complete"
        />
        <View style={styles.progressText}>
          {nowLine ? (
            <AppText variant="callout" color="accent" numberOfLines={1}>
              {nowLine}
            </AppText>
          ) : null}
          {summaryLine ? (
            <AppText variant="callout" color="secondary" numberOfLines={3}>
              {summaryLine}
            </AppText>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  progressText: {
    flex: 1,
    gap: spacing.xs,
  },
});
