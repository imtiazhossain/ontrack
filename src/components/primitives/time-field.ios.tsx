import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import {
  clampMinutesFromMidnight,
  dateToMinutes,
  minutesToDate,
  type TimeFieldProps,
} from './time-field.types';

/** iOS wheel / spinner time picker — always inline. */
export function TimeField({
  label = 'Time',
  value,
  onChange,
  disabled = false,
  accessibilityLabel = label,
  testID,
}: TimeFieldProps) {
  const theme = useTheme();
  const minutes = clampMinutesFromMidnight(value);

  return (
    <View style={styles.wrapper} accessibilityLabel={accessibilityLabel}>
      <AppText variant="overline" color="tertiary">
        {label}
      </AppText>
      <ExpoDateTimePicker
        value={minutesToDate(minutes)}
        mode="time"
        display="spinner"
        locale="en_US"
        accentColor={theme.accentPrimary}
        themeVariant={theme.name}
        disabled={disabled}
        style={styles.timePicker}
        testID={testID}
        onValueChange={(_event, selected) => onChange(dateToMinutes(selected))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  timePicker: {
    width: '100%',
    height: 180,
  },
});
