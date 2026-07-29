import NativeDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives/app-text';
import { Symbol } from '@/components/primitives/symbol';
import {
  clampMinutesFromMidnight,
  dateToMinutes,
  minutesToDate,
  type TimeFieldProps,
} from '@/components/primitives/time-field.types';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, nowMinutes } from '@/utils/date';

/**
 * Android-only Material time field: pressable summary + dialog clock picker.
 * Mounted via `time-field.android.tsx`; iOS must not import this module.
 */
export function MaterialTimeField({
  label = 'Time',
  value,
  onChange,
  disabled = false,
  accessibilityLabel = label,
  testID,
}: TimeFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const minutes = clampMinutesFromMidnight(value ?? nowMinutes());
  const displayValue = value === null ? 'Choose time' : formatMinutes(minutes);

  return (
    <View style={styles.wrapper}>
      <AppText variant="overline" color="tertiary">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: displayValue }}
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.backgroundSunken,
            opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
          },
        ]}>
        <Symbol name="appointment" size="sm" color={theme.textSecondary} />
        <AppText variant="body" style={styles.timeText}>
          {displayValue}
        </AppText>
      </Pressable>

      {showPicker ? (
        <NativeDateTimePicker
          value={minutesToDate(minutes)}
          mode="time"
          display="clock"
          presentation="dialog"
          is24Hour={false}
          accentColor={theme.accentPrimary}
          positiveButton={{ label: 'Done' }}
          negativeButton={{ label: 'Cancel' }}
          onDismiss={() => setShowPicker(false)}
          onValueChange={(_event, selected) => {
            onChange(dateToMinutes(selected));
            setShowPicker(false);
          }}
          testID={testID}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  field: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    flex: 1,
  },
});
