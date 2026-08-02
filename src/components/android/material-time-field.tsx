import NativeDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives/app-text';
import { FieldLeadingIcon } from '@/components/primitives/field-leading-icon';
import { Symbol } from '@/components/primitives/symbol';
import {
  clampMinutesFromMidnight,
  dateToMinutes,
  minutesToDate,
  type TimeFieldProps,
} from '@/components/primitives/time-field.types';
import { radii, spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, nowMinutes } from '@/utils/date';

/**
 * Android-only Material time field: pressable summary + dialog clock picker.
 * Mounted via `time-field.android.tsx`; iOS must not import this module.
 */
export function MaterialTimeField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = 'Time',
  stackedLabel,
  iconBackground,
  iconColor,
  fieldBackground,
  stackedLabelColor,
  placeholderColor,
  showChevron = false,
  accessibilityLabel,
  testID,
}: TimeFieldProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const [showPicker, setShowPicker] = useState(false);
  const minutes = clampMinutesFromMidnight(value ?? nowMinutes());
  const hasValue = value !== null;
  const displayValue = hasValue ? formatMinutes(minutes) : placeholder;
  const resolvedA11yLabel = accessibilityLabel ?? label ?? stackedLabel ?? 'Time';
  const stacked = Boolean(stackedLabel);

  return (
    <View style={styles.wrapper}>
      {label && !stacked ? (
        <AppText variant="overline" color="tertiary" fit>
          {label}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={resolvedA11yLabel}
        accessibilityValue={{ text: displayValue }}
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: stacked ? Math.max(56, s(60)) : 48,
            borderRadius: stacked ? radii.lg : radii.md,
            paddingVertical: stacked ? spacing.sm : 0,
            alignItems: stacked ? 'flex-start' : 'center',
            backgroundColor: fieldBackground ?? theme.backgroundSunken,
            opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
          },
        ]}>
        <View style={stacked ? { paddingTop: s(2) } : undefined}>
          <FieldLeadingIcon
            name="clock"
            backgroundColor={iconBackground}
            color={iconColor}
          />
        </View>
        {stacked ? (
          <View style={styles.stackedCopy}>
            <AppText
              variant="caption"
              fit
              numberOfLines={1}
              style={{
                flexShrink: 1,
                minWidth: 0,
                fontWeight: '600',
                color: stackedLabelColor ?? theme.textPrimary,
              }}>
              {stackedLabel}
            </AppText>
            <AppText
              variant="body"
              fit
              numberOfLines={1}
              style={{
                flexShrink: 1,
                minWidth: 0,
                color: hasValue
                  ? theme.textPrimary
                  : (placeholderColor ?? theme.textTertiary),
              }}>
              {displayValue}
            </AppText>
          </View>
        ) : (
          <AppText
            variant="body"
            color={hasValue ? 'primary' : 'tertiary'}
            style={styles.timeText}>
            {displayValue}
          </AppText>
        )}
        {showChevron ? (
          <View style={stacked ? { paddingTop: s(10) } : undefined}>
            <Symbol
              name="chevron-down"
              size="sm"
              color={placeholderColor ?? theme.textTertiary}
            />
          </View>
        ) : null}
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
  stackedCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  timeText: {
    flex: 1,
    minWidth: 0,
  },
});
