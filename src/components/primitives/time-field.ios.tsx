import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, shadows, spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, formatTimePickerTitle, nowMinutes } from '@/utils/date';

import { AppText } from './app-text';
import { IconButton } from './button';
import { FieldLeadingIcon } from './field-leading-icon';
import { Symbol } from './symbol';
import {
  clampMinutesFromMidnight,
  dateToMinutes,
  minutesToDate,
  type TimeFieldProps,
} from './time-field.types';

/** Tappable iOS time field backed by a full-width native wheel picker. */
export function TimeField({
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
  const insets = useSafeAreaInsets();
  const { spacing: rs, layout, s } = useResponsive();
  const [showPicker, setShowPicker] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(() =>
    clampMinutesFromMidnight(value ?? nowMinutes()),
  );
  const hasValue = value !== null;
  const displayValue = hasValue
    ? formatMinutes(clampMinutesFromMidnight(value))
    : placeholder;
  const resolvedA11yLabel = accessibilityLabel ?? label ?? stackedLabel ?? 'Time';
  const pickerTitle = formatTimePickerTitle(resolvedA11yLabel);
  const stacked = Boolean(stackedLabel);

  const openPicker = () => {
    setDraftMinutes(clampMinutesFromMidnight(value ?? nowMinutes()));
    setShowPicker(true);
  };

  const commitDraft = () => {
    onChange(draftMinutes);
    setShowPicker(false);
  };

  return (
    <View style={[styles.wrapper, { gap: rs.sm }]}>
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
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: stacked ? Math.max(56, s(60)) : Math.max(44, s(48)),
            borderRadius: stacked ? radii.lg : radii.md,
            paddingHorizontal: rs.md,
            paddingVertical: stacked ? rs.sm : 0,
            alignItems: stacked ? 'flex-start' : 'center',
            backgroundColor: fieldBackground ?? theme.backgroundSunken,
            opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
          },
        ]}
        testID={testID}>
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
              styles.pickerSheet,
              {
                backgroundColor: theme.backgroundElevated,
                maxWidth: Math.min(layout.maxContentWidth, s(420)),
                padding: rs.md,
                gap: rs.sm,
              },
            ]}>
            <View style={[styles.pickerHeader, { gap: rs.sm }]}>
              <AppText variant="heading" fit style={styles.pickerTitle}>
                {pickerTitle}
              </AppText>
              <IconButton
                icon="close"
                accessibilityLabel="Close time picker"
                background={theme.backgroundSunken}
                borderColor={theme.separator}
                onPress={() => setShowPicker(false)}
              />
            </View>
            <ExpoDateTimePicker
              value={minutesToDate(draftMinutes)}
              mode="time"
              display="spinner"
              locale="en_US"
              accentColor={theme.accentPrimary}
              themeVariant={theme.name}
              style={styles.timePicker}
              testID={testID ? `${testID}-picker` : undefined}
              onValueChange={(_event, selected) =>
                setDraftMinutes(dateToMinutes(selected))
              }
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={commitDraft}
              style={({ pressed }) => [
                styles.done,
                {
                  minHeight: Math.max(44, s(48)),
                  paddingHorizontal: rs.md,
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  field: {
    width: '100%',
    borderRadius: radii.md,
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
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
  },
  pickerSheet: {
    width: '100%',
    alignSelf: 'center',
    ...shadows.overlay,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    flex: 1,
    minWidth: 0,
  },
  timePicker: {
    width: '100%',
    height: 156,
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
