import { StyleSheet, View } from 'react-native';

import { DateField } from '@/components/primitives';
import { spacing } from '@/design-system';

interface TravelDateRangeEditorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export function TravelDateRangeEditor({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: TravelDateRangeEditorProps) {
  const changeStartDate = (value: string) => {
    onStartDateChange(value);
    if (endDate < value) onEndDateChange(value);
  };

  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <DateField label="Departure" value={startDate} onChange={changeStartDate} />
      </View>
      <View style={styles.flex}>
        <DateField
          label="Return"
          value={endDate}
          minimumDate={startDate}
          onChange={onEndDateChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
