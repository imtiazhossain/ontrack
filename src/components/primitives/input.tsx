import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import { FieldLeadingIcon } from './field-leading-icon';

interface InputProps extends TextInputProps {
  label?: string;
  /** Leading icon inside the field, matching DateField / TimeField chrome. */
  icon?: AppIconName;
  /** Persistent label above the value when `icon` is set (sheet stacked chrome). */
  stackedLabel?: string;
  iconBackground?: string;
  iconColor?: string;
  fieldBackground?: string;
  stackedLabelColor?: string;
  trailing?: ReactNode;
}

export function Input({
  label,
  style,
  icon,
  stackedLabel,
  iconBackground,
  iconColor,
  fieldBackground,
  stackedLabelColor,
  trailing,
  multiline,
  placeholder,
  placeholderTextColor,
  value,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const { typography, spacing, s } = useResponsive();
  const minHeight = Math.max(44, s(48));
  const stackedMinHeight = Math.max(56, s(60));
  const hasIcon = Boolean(icon);
  const stacked = Boolean(stackedLabel && icon);
  const [focused, setFocused] = useState(false);
  const hasValue = String(value ?? '').length > 0;
  const showChromePlaceholder =
    hasIcon && !stacked && !hasValue && !focused && Boolean(placeholder);
  const body = typography.body;
  const fill = fieldBackground ?? theme.backgroundSunken;

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
      <View style={[styles.wrapper, { gap: spacing.sm }]}>
        {label && !stacked ? (
          <AppText variant="overline" color="tertiary" fit>
            {label}
          </AppText>
        ) : null}
        <View
          style={[
            styles.iconField,
            {
              minHeight: stacked ? stackedMinHeight : minHeight,
              height: multiline && hasValue ? undefined : stacked ? undefined : minHeight,
              borderRadius: radii.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: stacked ? spacing.sm : 0,
              gap: spacing.sm,
              backgroundColor: fill,
              alignItems: stacked ? 'flex-start' : 'center',
            },
          ]}>
          <View style={stacked ? { paddingTop: s(2) } : undefined}>
            <FieldLeadingIcon
              name={icon}
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
                style={[
                  styles.stackedLabel,
                  { color: stackedLabelColor ?? theme.textPrimary },
                ]}>
                {stackedLabel}
              </AppText>
              <TextInput
                value={value}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor ?? theme.textTertiary}
                allowFontScaling
                maxFontSizeMultiplier={1.3}
                multiline={multiline}
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
                    minHeight: multiline ? undefined : Math.max(20, s(22)),
                    padding: 0,
                    margin: 0,
                    textAlignVertical: multiline ? 'top' : 'center',
                  },
                  trailing ? { paddingRight: s(40) } : null,
                  style,
                ]}
                {...rest}
                underlineColorAndroid="transparent"
              />
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
              value={value}
              placeholder={undefined}
              allowFontScaling
              maxFontSizeMultiplier={1.3}
              multiline={multiline}
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
              value={value}
              caretHidden
              allowFontScaling
              maxFontSizeMultiplier={1.3}
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
    <View style={[styles.wrapper, { gap: spacing.sm }]}>
      {label ? (
        <AppText variant="overline" color="tertiary" fit>
          {label}
        </AppText>
      ) : null}
      <View style={styles.field}>
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? theme.textTertiary}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          multiline={multiline}
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
    overflow: 'hidden',
  },
  stackedCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  stackedLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontWeight: '600',
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
