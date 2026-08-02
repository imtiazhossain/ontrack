import NativeDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, shadows } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import {
  formatDateKey,
  formatDatePickerTitle,
  fromDateKey,
  isDateKey,
  toDateKey,
} from '@/utils/date';

import { AppText } from './app-text';
import { IconButton } from './button';
import { DateFieldCalendar } from './date-field-calendar';
import { FieldLeadingIcon } from './field-leading-icon';

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
  /** Shown when `value` is empty / not a date key. */
  placeholder?: string;
  /** Persistent label above the value (sheet stacked chrome). */
  stackedLabel?: string;
  iconBackground?: string;
  iconColor?: string;
  fieldBackground?: string;
  stackedLabelColor?: string;
  placeholderColor?: string;
  accessibilityLabel?: string;
  testID?: string;
}

function optionalPickerDate(value: string | undefined): Date | undefined {
  return value && isDateKey(value) ? fromDateKey(value) : undefined;
}

/** Initial calendar cursor: stored value, else min, else today (clamped to range). */
function initialPickerDate(
  value: string,
  minimumDate?: string,
  maximumDate?: string,
): Date {
  if (isDateKey(value)) return fromDateKey(value);
  const min = optionalPickerDate(minimumDate);
  const max = optionalPickerDate(maximumDate);
  let next = min ? new Date(min) : new Date();
  if (min && next < min) next = new Date(min);
  if (max && next > max) next = new Date(max);
  return next;
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled = false,
  placeholder = 'MM/DD/YYYY',
  stackedLabel,
  iconBackground,
  iconColor,
  fieldBackground,
  stackedLabelColor,
  placeholderColor,
  accessibilityLabel,
  testID,
}: DateFieldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, layout, s } = useResponsive();
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState(() =>
    initialPickerDate(value, minimumDate, maximumDate),
  );
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const initial = initialPickerDate(value, minimumDate, maximumDate);
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12);
  });
  const min = optionalPickerDate(minimumDate);
  const max = optionalPickerDate(maximumDate);
  const hasValue = isDateKey(value);
  const displayValue = hasValue ? formatDateKey(value, dateDisplayFormat) : '';
  const resolvedPlaceholder =
    placeholder === 'MM/DD/YYYY' && dateDisplayFormat === 'iso'
      ? 'YYYY-MM-DD'
      : placeholder;
  const resolvedA11yLabel = accessibilityLabel ?? label ?? stackedLabel ?? 'Date';
  const pickerTitle = formatDatePickerTitle(resolvedA11yLabel);
  const stacked = Boolean(stackedLabel);

  const openPicker = () => {
    const initial = initialPickerDate(value, minimumDate, maximumDate);
    setDraftDate(initial);
    setCalendarCursor(new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
    setShowPicker(true);
  };

  const commitDraft = () => {
    onChange(toDateKey(draftDate));
    setShowPicker(false);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {label && !stacked ? (
        <AppText variant="overline" color="tertiary" fit>
          {label}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={resolvedA11yLabel}
        accessibilityValue={{ text: displayValue || resolvedPlaceholder }}
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => [
          {
            minHeight: stacked ? Math.max(56, s(60)) : Math.max(44, s(48)),
            borderRadius: stacked ? radii.lg : radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: stacked ? spacing.sm : 0,
            flexDirection: 'row',
            alignItems: stacked ? 'flex-start' : 'center',
            gap: spacing.sm,
            backgroundColor: fieldBackground ?? theme.backgroundSunken,
            opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
          },
        ]}>
        <View style={stacked ? { paddingTop: s(2) } : undefined}>
          <FieldLeadingIcon
            name="calendar"
            backgroundColor={iconBackground}
            color={iconColor}
          />
        </View>
        {stacked ? (
          <View style={{ flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' }}>
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
              {hasValue ? displayValue : resolvedPlaceholder}
            </AppText>
          </View>
        ) : (
          <AppText
            variant="body"
            fit
            color={hasValue ? 'primary' : 'tertiary'}
            style={{ flex: 1, minWidth: 0 }}>
            {hasValue ? displayValue : resolvedPlaceholder}
          </AppText>
        )}
      </Pressable>

      {process.env.EXPO_OS === 'android' && showPicker ? (
        <NativeDateTimePicker
          value={draftDate}
          mode="date"
          display="calendar"
          presentation="dialog"
          minimumDate={min}
          maximumDate={max}
          accentColor={theme.accentPrimary}
          positiveButton={{ label: 'Done' }}
          negativeButton={{ label: 'Cancel' }}
          onDismiss={() => setShowPicker(false)}
          onValueChange={(_event, selectedDate) => {
            setDraftDate(selectedDate);
            onChange(toDateKey(selectedDate));
            setShowPicker(false);
          }}
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
                  maxWidth: Math.min(layout.maxContentWidth, s(420)),
                  padding: spacing.md,
                  gap: spacing.sm,
                },
              ]}>
              <View style={[styles.calendarHeader, { gap: spacing.sm }]}>
                <AppText variant="heading" fit style={styles.calendarTitle}>
                  {pickerTitle}
                </AppText>
                <IconButton
                  icon="close"
                  accessibilityLabel="Close calendar"
                  background={theme.backgroundSunken}
                  borderColor={theme.separator}
                  onPress={() => setShowPicker(false)}
                />
              </View>
              <DateFieldCalendar
                value={draftDate}
                cursor={calendarCursor}
                minimumDate={min}
                maximumDate={max}
                onCursorChange={setCalendarCursor}
                onValueChange={setDraftDate}
                testID={testID}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={commitDraft}
                style={({ pressed }) => [
                  styles.done,
                  {
                    minHeight: Math.max(44, s(48)),
                    paddingHorizontal: spacing.md,
                    backgroundColor: theme.accentPrimary,
                    borderColor: theme.accentSoft,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <AppText variant="subheading" color="onAccent" fit>
                  Done
                </AppText>
              </Pressable>
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
    ...shadows.overlay,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
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
  done: {
    ...shadows.raised,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
