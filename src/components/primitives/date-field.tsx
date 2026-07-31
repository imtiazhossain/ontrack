import NativeDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import {
  formatDateKey,
  fromDateKey,
  isDateKey,
  nativeDatePickerLocale,
  toDateKey,
} from '@/utils/date';

import { AppText } from './app-text';
import { IconButton } from './button';
import { Symbol } from './symbol';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

function pickerDate(value: string): Date {
  return isDateKey(value) ? fromDateKey(value) : new Date();
}

function optionalPickerDate(value: string | undefined): Date | undefined {
  return value && isDateKey(value) ? fromDateKey(value) : undefined;
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled = false,
  accessibilityLabel = label,
  testID,
}: DateFieldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, layout, s } = useResponsive();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const [showPicker, setShowPicker] = useState(false);
  const date = pickerDate(value);
  const min = optionalPickerDate(minimumDate);
  const max = optionalPickerDate(maximumDate);
  const displayValue = formatDateKey(value, dateDisplayFormat);

  const changeDate = (next: Date, close: boolean) => {
    onChange(toDateKey(next));
    if (close) setShowPicker(false);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="overline" color="tertiary" fit>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: displayValue }}
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          {
            minHeight: Math.max(44, s(48)),
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: theme.backgroundSunken,
            opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
          },
        ]}>
        <Symbol name="calendar" size="sm" color={theme.textSecondary} />
        <AppText variant="body" fit style={{ flex: 1, minWidth: 0 }}>
          {displayValue}
        </AppText>
      </Pressable>

      {process.env.EXPO_OS === 'android' && showPicker ? (
        <NativeDateTimePicker
          value={date}
          mode="date"
          display="calendar"
          presentation="dialog"
          minimumDate={min}
          maximumDate={max}
          accentColor={theme.accentPrimary}
          positiveButton={{ label: 'Done' }}
          negativeButton={{ label: 'Cancel' }}
          onDismiss={() => setShowPicker(false)}
          onValueChange={(_event, selectedDate) => changeDate(selectedDate, true)}
          testID={testID}
        />
      ) : null}

      {process.env.EXPO_OS === 'ios' ? (
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
                paddingHorizontal: layout.screenPadding,
              },
            ]}>
            <Pressable
              accessible={false}
              onPress={() => setShowPicker(false)}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.calendarSheet,
                {
                  backgroundColor: theme.backgroundElevated,
                  maxWidth: layout.maxContentWidth,
                  padding: spacing.lg,
                  gap: spacing.sm,
                },
              ]}>
              <View style={[styles.calendarHeader, { gap: spacing.md }]}>
                <AppText variant="subheading" fit style={styles.calendarTitle}>
                  {label}
                </AppText>
                <IconButton
                  icon="close"
                  size={s(36)}
                  accessibilityLabel="Close calendar"
                  background={theme.backgroundSunken}
                  onPress={() => setShowPicker(false)}
                />
              </View>
              <NativeDateTimePicker
                value={date}
                mode="date"
                display="inline"
                minimumDate={min}
                maximumDate={max}
                accentColor={theme.accentPrimary}
                themeVariant={theme.name}
                locale={nativeDatePickerLocale(dateLocale)}
                onValueChange={(_event, selectedDate) => changeDate(selectedDate, false)}
                style={styles.calendar}
                testID={testID}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
  },
  calendarSheet: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarTitle: {
    flex: 1,
    minWidth: 0,
  },
  calendar: {
    width: '100%',
    height: 340,
  },
});
