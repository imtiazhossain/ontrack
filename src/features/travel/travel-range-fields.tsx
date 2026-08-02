import { StyleSheet, View } from 'react-native';

import { DateField, TimeField } from '@/components/primitives';
import type { TravelRangeScheduleDraft } from '@/features/travel/travel-range-schedule';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export function TravelRangeFields({
  value,
  startDateLabel,
  startTimeLabel,
  endDateLabel,
  endTimeLabel,
  minimumDate,
  maximumDate,
  onChange,
}: {
  value: TravelRangeScheduleDraft;
  startDateLabel: string;
  startTimeLabel: string;
  endDateLabel: string;
  endTimeLabel: string;
  minimumDate?: string;
  maximumDate?: string;
  onChange: (value: TravelRangeScheduleDraft) => void;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const fieldMinWidth = Math.max(132, s(142));

  return (
    <View style={{ gap: rs.sm }}>
      <View style={[styles.row, { gap: rs.sm }]}>
        <View style={[styles.field, { minWidth: fieldMinWidth }]}>
          <DateField
            value={value.startDate}
            onChange={(startDate) => onChange({ ...value, startDate })}
            stackedLabel={startDateLabel}
            placeholder="Select date"
            accessibilityLabel={startDateLabel}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            {...itinerarySheetFieldProps(chrome, 'calendar')}
          />
        </View>
        <View style={[styles.field, { minWidth: fieldMinWidth }]}>
          <TimeField
            value={value.startMinutes}
            onChange={(startMinutes) => onChange({ ...value, startMinutes })}
            stackedLabel={startTimeLabel}
            placeholder="Select time"
            accessibilityLabel={startTimeLabel}
            {...itinerarySheetFieldProps(chrome, 'clock')}
          />
        </View>
      </View>
      <View style={[styles.row, { gap: rs.sm }]}>
        <View style={[styles.field, { minWidth: fieldMinWidth }]}>
          <DateField
            value={value.endDate}
            onChange={(endDate) => onChange({ ...value, endDate })}
            stackedLabel={endDateLabel}
            placeholder="Select date"
            accessibilityLabel={endDateLabel}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            {...itinerarySheetFieldProps(chrome, 'calendar')}
          />
        </View>
        <View style={[styles.field, { minWidth: fieldMinWidth }]}>
          <TimeField
            value={value.endMinutes}
            onChange={(endMinutes) => onChange({ ...value, endMinutes })}
            stackedLabel={endTimeLabel}
            placeholder="Select time"
            accessibilityLabel={endTimeLabel}
            {...itinerarySheetFieldProps(chrome, 'clock')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  field: { flex: 1, minWidth: 0 },
});
