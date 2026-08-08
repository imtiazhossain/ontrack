import { Pressable, StyleSheet, View } from 'react-native';

import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { formatMonthTitle, monthGrid, toDateKey } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { AppText } from './app-text';
import { IconButton } from './button';

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function CalendarDay({
  dateKey,
  day,
  selected,
  inRange,
  rangeEndpoint,
  disabled,
  onPress,
  testID,
}: {
  dateKey: string;
  day: number;
  selected: boolean;
  inRange: boolean;
  rangeEndpoint: boolean;
  disabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { s } = useResponsive();
  const agent = useAgentUiTarget(testID, {
    label: dateKey,
    onPress: disabled ? undefined : onPress,
  });

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={dateKey}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        styles.dayCell,
        { minHeight: Math.max(44, s(46)) },
        inRange && { backgroundColor: theme.backgroundSunken },
        (selected || rangeEndpoint) && { backgroundColor: theme.accentFaint },
        pressed && { opacity: 0.58 },
      ]}>
      <AppText
        variant="subheading"
        color={selected || rangeEndpoint ? 'accent' : disabled ? 'tertiary' : 'primary'}
        align="center"
        style={styles.dayText}>
        {day}
      </AppText>
    </Pressable>
  );
}

interface DateFieldCalendarProps {
  value: Date;
  cursor: Date;
  rangeStart?: Date;
  rangeEnd?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCursorChange: (value: Date) => void;
  onValueChange: (value: Date) => void;
  /** Frosted month chevrons on glass sheets; solid elevated elsewhere. */
  controlAppearance?: 'solid' | 'glass';
  testID?: string;
}

function monthCanContainDate(
  year: number,
  month: number,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  const firstKey = toDateKey(new Date(year, month, 1, 12));
  const lastKey = toDateKey(new Date(year, month + 1, 0, 12));
  const minimumKey = minimumDate ? toDateKey(minimumDate) : undefined;
  const maximumKey = maximumDate ? toDateKey(maximumDate) : undefined;
  return (!minimumKey || lastKey >= minimumKey) && (!maximumKey || firstKey <= maximumKey);
}

export function DateFieldCalendar({
  value,
  cursor,
  rangeStart,
  rangeEnd,
  minimumDate,
  maximumDate,
  onCursorChange,
  onValueChange,
  controlAppearance = 'glass',
  testID,
}: DateFieldCalendarProps) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const selectedKey = toDateKey(value);
  const rangeStartKey = rangeStart ? toDateKey(rangeStart) : undefined;
  const rangeEndKey = rangeEnd ? toDateKey(rangeEnd) : undefined;
  const minimumKey = minimumDate ? toDateKey(minimumDate) : undefined;
  const maximumKey = maximumDate ? toDateKey(maximumDate) : undefined;
  const cells = monthGrid(year, month);
  const lastMonthCell = cells.reduce(
    (last, cell, index) => (cell.inMonth ? index : last),
    0,
  );
  const weekCount = Math.ceil((lastMonthCell + 1) / 7);
  const previousMonthEnabled = monthCanContainDate(year, month - 1, minimumDate, maximumDate);
  const nextMonthEnabled = monthCanContainDate(year, month + 1, minimumDate, maximumDate);
  const glassControls = controlAppearance === 'glass';

  const shiftMonth = (delta: number) => {
    haptics.select();
    onCursorChange(new Date(year, month + delta, 1, 12));
  };

  return (
    <View testID={testID} style={{ gap: spacing.sm }}>
      <View style={[styles.monthHeader, { gap: spacing.sm }]}>
        <AppText variant="subheading" fit style={styles.monthTitle}>
          {formatMonthTitle(year, month)}
        </AppText>
        <View style={[styles.monthActions, { gap: spacing.sm }]}>
          <IconButton
            icon="chevron-left"
            testID={testID ? `${testID}.previousMonth` : undefined}
            appearance={controlAppearance}
            background={glassControls ? undefined : theme.backgroundElevated}
            borderColor={glassControls ? undefined : theme.separator}
            disabled={!previousMonthEnabled}
            accessibilityLabel="Previous month"
            onPress={() => shiftMonth(-1)}
          />
          <IconButton
            icon="chevron-right"
            testID={testID ? `${testID}.nextMonth` : undefined}
            appearance={controlAppearance}
            background={glassControls ? undefined : theme.backgroundElevated}
            borderColor={glassControls ? undefined : theme.separator}
            disabled={!nextMonthEnabled}
            accessibilityLabel="Next month"
            onPress={() => shiftMonth(1)}
          />
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <AppText
            key={label}
            variant="overline"
            color="tertiary"
            align="center"
            fit
            style={styles.cell}>
            {label}
          </AppText>
        ))}
      </View>

      <View>
        {Array.from({ length: weekCount }, (_, week) => (
          <View key={week} style={styles.weekRow}>
            {cells.slice(week * 7, week * 7 + 7).map((cell) => {
              if (!cell.inMonth) return <View key={cell.key} style={styles.cell} />;

              const selected = cell.key === selectedKey;
              const inRange = Boolean(
                rangeStartKey &&
                  rangeEndKey &&
                  cell.key >= rangeStartKey &&
                  cell.key <= rangeEndKey,
              );
              const rangeEndpoint = cell.key === rangeStartKey || cell.key === rangeEndKey;
              const disabled =
                (minimumKey !== undefined && cell.key < minimumKey) ||
                (maximumKey !== undefined && cell.key > maximumKey);
              return (
                <CalendarDay
                  key={cell.key}
                  dateKey={cell.key}
                  day={cell.day}
                  selected={selected}
                  inRange={inRange}
                  rangeEndpoint={rangeEndpoint}
                  disabled={disabled}
                  testID={testID ? `${testID}.day.${cell.key}` : undefined}
                  onPress={() => {
                    haptics.select();
                    onValueChange(new Date(year, month, cell.day, 12));
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    flex: 1,
    minWidth: 0,
  },
  monthActions: {
    flexDirection: 'row',
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderCurve: 'continuous',
  },
  dayText: {
    fontVariant: ['tabular-nums'],
  },
});
