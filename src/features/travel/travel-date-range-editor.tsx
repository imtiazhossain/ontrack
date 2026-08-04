import { StyleSheet, View } from 'react-native';

import { DateField } from '@/components/primitives';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

interface TravelDateRangeEditorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  stacked?: boolean;
  startTestID?: string;
  endTestID?: string;
}

export function TravelDateRangeEditor({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = 'Departure',
  endLabel = 'Return',
  stacked = false,
  startTestID,
  endTestID,
}: TravelDateRangeEditorProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { spacing } = useResponsive();
  const changeStartDate = (value: string) => {
    onStartDateChange(value);
    if (endDate < value) onEndDateChange(value);
  };

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      <View style={styles.flex}>
        <DateField
          testID={startTestID}
          label={stacked ? undefined : startLabel}
          stackedLabel={stacked ? startLabel : undefined}
          value={startDate}
          onChange={changeStartDate}
          accessibilityLabel={`${startLabel} date`}
          {...(stacked ? itinerarySheetFieldProps(chrome, 'calendar') : {})}
        />
      </View>
      <View style={styles.flex}>
        <DateField
          testID={endTestID}
          label={stacked ? undefined : endLabel}
          stackedLabel={stacked ? endLabel : undefined}
          value={endDate}
          minimumDate={startDate}
          onChange={onEndDateChange}
          accessibilityLabel={`${endLabel} date`}
          {...(stacked ? itinerarySheetFieldProps(chrome, 'calendar') : {})}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex: { flex: 1, flexShrink: 1, minWidth: 0 },
});
