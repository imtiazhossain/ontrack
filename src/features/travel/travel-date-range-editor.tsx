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
  stacked?: boolean;
}

export function TravelDateRangeEditor({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  stacked = false,
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
          label={stacked ? undefined : 'Departure'}
          stackedLabel={stacked ? 'Departure' : undefined}
          value={startDate}
          onChange={changeStartDate}
          accessibilityLabel="Departure date"
          {...(stacked ? itinerarySheetFieldProps(chrome, 'calendar') : {})}
        />
      </View>
      <View style={styles.flex}>
        <DateField
          label={stacked ? undefined : 'Return'}
          stackedLabel={stacked ? 'Return' : undefined}
          value={endDate}
          minimumDate={startDate}
          onChange={onEndDateChange}
          accessibilityLabel="Return date"
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
