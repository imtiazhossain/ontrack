import { Pressable, StyleSheet, View } from 'react-native';

import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthTitle, monthGrid, toDateKey } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { AppText } from './app-text';
import { IconButton } from './button';

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface DateFieldCalendarProps {
  value: Date;
  cursor: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCursorChange: (value: Date) => void;
  onValueChange: (value: Date) => void;
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
  minimumDate,
  maximumDate,
  onCursorChange,
  onValueChange,
  testID,
}: DateFieldCalendarProps) {
  const theme = useTheme();
  const { spacing, s } = useResponsive();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const selectedKey = toDateKey(value);
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
            background={theme.backgroundElevated}
            borderColor={theme.separator}
            disabled={!previousMonthEnabled}
            accessibilityLabel="Previous month"
            onPress={() => shiftMonth(-1)}
          />
          <IconButton
            icon="chevron-right"
            background={theme.backgroundElevated}
            borderColor={theme.separator}
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
              const disabled =
                (minimumKey !== undefined && cell.key < minimumKey) ||
                (maximumKey !== undefined && cell.key > maximumKey);
              return (
                <Pressable
                  key={cell.key}
                  accessibilityRole="button"
                  accessibilityLabel={cell.key}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => {
                    haptics.select();
                    onValueChange(new Date(year, month, cell.day, 12));
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.dayCell,
                    { minHeight: Math.max(44, s(46)) },
                    selected && { backgroundColor: theme.accentFaint },
                    pressed && { opacity: 0.58 },
                  ]}>
                  <AppText
                    variant="subheading"
                    color={selected ? 'accent' : disabled ? 'tertiary' : 'primary'}
                    align="center"
                    style={styles.dayText}>
                    {cell.day}
                  </AppText>
                </Pressable>
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
