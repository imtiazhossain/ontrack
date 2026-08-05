import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { formatNumericInput } from '@/utils/parse';
import { AppText } from './app-text';
import { FieldLeadingIcon, fieldLeadingIconRowStyle } from './field-leading-icon';
import { stackedFieldMinHeight } from './field-leading-icon-style';
import { StackedFieldLabel } from './stacked-field-label';

interface InputProps extends TextInputProps {
  label?: string;
  /** Leading icon inside the field, matching DateField / TimeField chrome. */
  icon?: AppIconName;
  /** Persistent label above the value when `icon` is set (sheet stacked chrome). */
  stackedLabel?: string;
  /** Align stacked label + value (`center` for short numeric fields). */
  stackedAlign?: 'start' | 'center';
  iconBackground?: string;
  iconColor?: string;
  fieldBackground?: string;
  stackedLabelColor?: string;
  /** Optional supporting copy shown below a stacked field value. */
  helperText?: string;
  trailing?: ReactNode;
  /** Layout for the complete field wrapper, such as `flex: 1` in a toolbar. */
  containerStyle?: StyleProp<ViewStyle>;
}

function numericSanitizeOptions(keyboardType: TextInputProps['keyboardType']) {
  if (keyboardType === 'number-pad') {
    return { decimals: false, allowComma: false } as const;
  }
  if (keyboardType === 'decimal-pad' || keyboardType === 'numeric') {
    return { decimals: true } as const;
  }
  return null;
}

function numericChangeForKeyboard(
  keyboardType: TextInputProps['keyboardType'],
  onChangeText: TextInputProps['onChangeText'],
) {
  const options = numericSanitizeOptions(keyboardType);
  if (!options) return onChangeText;
  if (!onChangeText) return undefined;

  // Keep form state machine-friendly (no separators) while rendering the
  // formatted value below. This avoids making every numeric consumer parse
  // display punctuation before saving.
  return (text: string) => onChangeText(formatNumericInput(text, options).replace(/,/g, ''));
}

function sanitizeNumericValue(
  value: TextInputProps['value'],
  keyboardType: TextInputProps['keyboardType'],
) {
  const options = numericSanitizeOptions(keyboardType);
  if (!options || value == null) return value;
  return formatNumericInput(String(value), options);
}

export function Input({
  label,
  style,
  icon,
  stackedLabel,
  stackedAlign = 'start',
  iconBackground,
  iconColor,
  fieldBackground,
  stackedLabelColor,
  helperText,
  trailing,
  containerStyle,
  multiline,
  placeholder,
  placeholderTextColor,
  value,
  onFocus,
  onBlur,
  keyboardType,
  onChangeText,
  testID,
  accessibilityLabel,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const { typography, spacing, s, fontScale } = useResponsive();
  const minHeight = Math.max(44, s(48));
  const stackedMinHeight = stackedFieldMinHeight({
    baseMinHeight: Math.max(56, s(60)),
    fontScale,
    labelLineHeight: typography.caption.lineHeight,
    valueLineHeight: typography.body.lineHeight,
    verticalPadding: spacing.sm,
  });
  const hasIcon = Boolean(icon);
  const stacked = Boolean(stackedLabel && icon);
  const stackedCentered = stacked && stackedAlign === 'center';
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const numericValue = sanitizeNumericValue(value, keyboardType);
  const hasValue = String(numericValue ?? '').length > 0;
  const showChromePlaceholder =
    hasIcon && !stacked && !hasValue && !focused && Boolean(placeholder);
  const body = typography.body;
  const fill = fieldBackground ?? theme.backgroundSunken;
  const handleChangeText = numericChangeForKeyboard(keyboardType, onChangeText);
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel ?? stackedLabel ?? label,
    onPress: () => inputRef.current?.focus(),
  });

  const handleFocus: TextInputProps['onFocus'] = (event) => {
    setFocused(true);
    onFocus?.(event);
  };
  const handleBlur: TextInputProps['onBlur'] = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  if (hasIcon && icon) {
    return (
      <View
        ref={agent.ref}
        collapsable={false}
        onLayout={agent.onLayout}
        style={[styles.wrapper, { gap: spacing.sm }, containerStyle]}>
        {label && !stacked ? (
          <AppText variant="overline" color="tertiary" fit>
            {label}
          </AppText>
        ) : null}
        <View
          style={[
            styles.iconField,
            fieldLeadingIconRowStyle({
              minHeight: stacked ? stackedMinHeight : minHeight,
              // Multiline inputs can be taller even while empty. Let the row
              // grow so the persistent label remains visible and the complete
              // label/value block stays vertically centered beside the icon.
              height: multiline
                ? undefined
                : stacked
                  ? undefined
                  : minHeight,
              borderRadius: radii.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: stacked ? spacing.sm : 0,
              gap: spacing.sm,
              backgroundColor: fill,
            }),
          ]}>
          <FieldLeadingIcon
            name={icon}
            backgroundColor={iconBackground}
            color={iconColor}
          />
          {stacked ? (
            <View
              style={[
                styles.stackedCopy,
                stackedCentered ? styles.stackedCopyCentered : null,
              ]}>
              <StackedFieldLabel
                color={stackedLabelColor ?? theme.textPrimary}
                align={stackedCentered ? 'center' : 'start'}
                style={styles.stackedLabel}>
                {stackedLabel!}
              </StackedFieldLabel>
              <TextInput
                ref={inputRef}
                testID={testID}
                accessibilityLabel={accessibilityLabel}
                value={numericValue}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor ?? theme.textTertiary}
                allowFontScaling
                maxFontSizeMultiplier={1.3}
                multiline={multiline}
                keyboardType={keyboardType}
                onChangeText={handleChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={[
                  styles.input,
                  styles.iconInput,
                  {
                    fontFamily: body.fontFamily,
                    fontSize: body.fontSize,
                    fontWeight: body.fontWeight,
                    lineHeight: body.lineHeight,
                    color: theme.textPrimary,
                    minHeight: multiline
                      ? undefined
                      : Math.max(
                          s(24),
                          Math.ceil(body.lineHeight * Math.min(fontScale, 1.3)),
                        ),
                    padding: 0,
                    margin: 0,
                    textAlignVertical: multiline ? 'top' : 'center',
                    textAlign: stackedCentered ? 'center' : undefined,
                  },
                  multiline ? styles.stackedMultilineInput : null,
                  trailing ? { paddingRight: s(40) } : null,
                  style,
                ]}
                {...rest}
                underlineColorAndroid="transparent"
              />
              {helperText ? (
                <AppText variant="caption" color="tertiary" numberOfLines={1}>
                  {helperText}
                </AppText>
              ) : null}
            </View>
          ) : showChromePlaceholder ? (
            <AppText
              variant="body"
              color="tertiary"
              numberOfLines={1}
              style={styles.chromeLabel}>
              {placeholder}
            </AppText>
          ) : (
            <TextInput
              ref={inputRef}
              testID={testID}
              accessibilityLabel={accessibilityLabel}
              value={numericValue}
              placeholder={undefined}
              allowFontScaling
              maxFontSizeMultiplier={1.3}
              multiline={multiline}
              keyboardType={keyboardType}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={[
                styles.input,
                styles.iconInput,
                {
                  fontFamily: body.fontFamily,
                  fontSize: body.fontSize,
                  fontWeight: body.fontWeight,
                  ...(multiline ? { lineHeight: body.lineHeight } : null),
                  color: theme.textPrimary,
                  minHeight: multiline ? undefined : Math.max(0, minHeight - 4),
                  textAlignVertical: 'center',
                },
                trailing ? { paddingRight: s(40) } : null,
                style,
              ]}
              {...rest}
              underlineColorAndroid="transparent"
            />
          )}
          {showChromePlaceholder ? (
            <TextInput
              ref={inputRef}
              testID={testID}
              accessibilityLabel={accessibilityLabel}
              value={numericValue}
              caretHidden
              allowFontScaling
              maxFontSizeMultiplier={1.3}
              keyboardType={keyboardType}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={styles.hitInput}
              {...rest}
              underlineColorAndroid="transparent"
            />
          ) : null}
          {trailing ? (
            <View style={[styles.trailing, { right: spacing.xs }]}>{trailing}</View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      ref={agent.ref}
      collapsable={false}
      onLayout={agent.onLayout}
      style={[styles.wrapper, { gap: spacing.sm }, containerStyle]}>
      {label ? (
        <AppText variant="overline" color="tertiary" fit>
          {label}
        </AppText>
      ) : null}
      <View style={styles.field}>
        <TextInput
          ref={inputRef}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          value={numericValue}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? theme.textTertiary}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          multiline={multiline}
          keyboardType={keyboardType}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            {
              borderRadius: radii.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              minHeight,
            },
            trailing ? { paddingRight: s(56) } : null,
            typography.body,
            {
              backgroundColor: fill,
              color: theme.textPrimary,
            },
            style,
          ]}
          {...rest}
          underlineColorAndroid="transparent"
        />
        {trailing ? (
          <View style={[styles.trailing, { right: spacing.xs }]}>{trailing}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  field: {
    position: 'relative',
  },
  iconField: {
    position: 'relative',
    flexDirection: 'row',
    overflow: 'visible',
  },
  stackedCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  stackedCopyCentered: {
    alignItems: 'center',
  },
  stackedLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
  chromeLabel: {
    flex: 1,
    minWidth: 0,
  },
  iconInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },
  stackedMultilineInput: {
    // A growing native multiline input can paint over its preceding label.
    // Its explicit/intrinsic height should size the stacked copy instead.
    flexGrow: 0,
    flexBasis: 'auto',
  },
  input: {},
  hitInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.02,
  },
  trailing: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
