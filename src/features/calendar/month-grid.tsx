import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import type { Activity } from '@/types/models';
import { dayIndicator } from '@/utils/completion';
import { isToday, monthGrid } from '@/utils/date';
import { haptics } from '@/utils/haptics';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MonthGridProps {
  year: number;
  month: number;
  selected: string;
  activitiesByDate: Record<string, Activity[]>;
  onSelect: (dateKey: string) => void;
}

export function MonthGrid({ year, month, selected, activitiesByDate, onSelect }: MonthGridProps) {
  const theme = useTheme();
  const cells = monthGrid(year, month);

  const indicatorColor = (dateKey: string): string | null => {
    const indicator = dayIndicator(activitiesByDate[dateKey] ?? []);
    switch (indicator) {
      case 'full':
        return theme.success;
      case 'partial':
        return theme.accentPrimary;
      case 'none':
        return theme.textTertiary;
      case 'empty':
        return null;
    }
  };

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <AppText key={i} variant="caption" color="tertiary" align="center" style={styles.cell}>
            {label}
          </AppText>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, week) => (
        <View key={week} style={styles.weekRow}>
          {cells.slice(week * 7, week * 7 + 7).map((cell) => {
            const today = isToday(cell.key);
            const isSelected = cell.key === selected;
            const dot = indicatorColor(cell.key);
            return (
              <Pressable
                key={cell.key}
                accessibilityRole="button"
                accessibilityLabel={cell.key}
                onPress={() => {
                  haptics.select();
                  onSelect(cell.key);
                }}
                style={[
                  styles.cell,
                  styles.dayCell,
                  isSelected && { backgroundColor: theme.accentFaint },
                  today && !isSelected && { borderWidth: 1, borderColor: theme.accentPrimary },
                ]}>
                <AppText
                  variant="callout"
                  color={cell.inMonth ? (isSelected ? 'accent' : 'primary') : 'tertiary'}>
                  {cell.day}
                </AppText>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: dot && cell.inMonth ? dot : 'transparent' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  cell: {
    flex: 1,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 0.9,
    borderRadius: radii.md,
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
