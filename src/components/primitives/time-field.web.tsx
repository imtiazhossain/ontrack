import { StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';

import { AppText } from './app-text';
import { Input } from './input';
import {
  clampMinutesFromMidnight,
  type TimeFieldProps,
} from './time-field.types';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** Web hour / minute number fields. */
export function TimeField({
  label = 'Time',
  value,
  onChange,
  disabled = false,
  accessibilityLabel = label,
  testID,
}: TimeFieldProps) {
  const minutes = clampMinutesFromMidnight(value);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const commit = (nextHours: string, nextMinutes: string) => {
    const h = Math.min(23, Math.max(0, Number(nextHours) || 0));
    const m = Math.min(59, Math.max(0, Number(nextMinutes) || 0));
    onChange(h * 60 + m);
  };

  return (
    <View style={styles.wrapper} accessibilityLabel={accessibilityLabel} testID={testID}>
      <AppText variant="overline" color="tertiary">
        {label}
      </AppText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Input
            label="Hour"
            value={pad(hours)}
            onChangeText={(next) => commit(next, String(mins))}
            keyboardType="number-pad"
            editable={!disabled}
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="Minute"
            value={pad(mins)}
            onChangeText={(next) => commit(String(hours), next)}
            keyboardType="number-pad"
            editable={!disabled}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
