import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, nowMinutes } from '@/utils/date';

import { AppText } from './app-text';
import { IconButton } from './button';
import { Symbol } from './symbol';
import {
  clampMinutesFromMidnight,
  dateToMinutes,
  minutesToDate,
  type TimeFieldProps,
} from './time-field.types';

/** Tappable iOS time field backed by a full-width native wheel picker. */
export function TimeField({
  label = 'Time',
  value,
  onChange,
  disabled = false,
  accessibilityLabel = label,
  testID,
}: TimeFieldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
        ]}
        testID={testID}>
        <Symbol name="clock" size="sm" color={theme.textSecondary} />
        <AppText variant="body" style={styles.timeText}>
          {displayValue}
        </AppText>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
        presentationStyle="overFullScreen"
        transparent
        visible={showPicker}>
        <View
          style={[
            styles.modalRoot,
            {
              backgroundColor: theme.overlayScrim,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}>
          <Pressable
            accessible={false}
            onPress={() => setShowPicker(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.pickerSheet, { backgroundColor: theme.backgroundElevated }]}>
            <View style={styles.pickerHeader}>
              <AppText variant="subheading" style={styles.pickerTitle}>
                {label}
              </AppText>
              <IconButton
                icon="close"
                size={36}
                accessibilityLabel="Close time picker"
                background={theme.backgroundSunken}
                onPress={() => setShowPicker(false)}
              />
            </View>
            <ExpoDateTimePicker
              value={minutesToDate(minutes)}
              mode="time"
              display="spinner"
              locale="en_US"
              accentColor={theme.accentPrimary}
              themeVariant={theme.name}
              style={styles.timePicker}
              testID={testID ? `${testID}-picker` : undefined}
              onValueChange={(_event, selected) => onChange(dateToMinutes(selected))}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  field: {
    width: '100%',
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: layout.screenPadding,
  },
  pickerSheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pickerTitle: {
    flex: 1,
    minWidth: 0,
  },
  timePicker: {
    width: '100%',
    height: 180,
  },
});
