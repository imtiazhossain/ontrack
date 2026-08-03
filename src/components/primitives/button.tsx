import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';
import { AppText } from './app-text';
import { LoadingSpinner } from './loading-spinner';
import { Symbol } from './symbol';

interface ButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  icon?: AppIconName;
  /** Replaces the leading icon with a spinner while work is in flight. */
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const { spacing, layout, iconSizes } = useResponsive();

  const background = {
    primary: theme.accentPrimary,
    secondary: theme.backgroundSunken,
    ghost: 'transparent',
    danger: theme.danger,
  }[variant];
  const textColor = (variant === 'primary' || variant === 'danger' ? 'onAccent' : 'primary') as
    | 'onAccent'
    | 'primary';
  const iconColor =
    variant === 'primary' || variant === 'danger' ? theme.textOnAccent : theme.textPrimary;
  const isDisabled = disabled || loading;
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: isDisabled ? undefined : handlePress,
  });

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          gap: spacing.sm,
          minHeight: layout.minTapTarget,
          paddingHorizontal: spacing.xl,
          paddingVertical: size === 'lg' ? spacing.lg : spacing.md,
          opacity: isDisabled && !loading ? 0.4 : pressed ? 0.75 : 1,
          backgroundColor: background,
        },
        style,
      ]}>
      {loading ? (
        <LoadingSpinner size={iconSizes.sm} color={iconColor} />
      ) : icon ? (
        <Symbol name={icon} size="sm" color={iconColor} />
      ) : null}
      <AppText
        variant={size === 'lg' ? 'subheading' : 'callout'}
        color={textColor}
        fit
        style={[{ flexShrink: 1 }, textStyle]}>
        {children}
      </AppText>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: AppIconName;
  onPress: () => void;
  color?: string;
  iconSize?: keyof ReturnType<typeof useResponsive>['iconSizes'] | number;
  background?: string;
  borderColor?: string;
  shape?: 'circle' | 'rounded';
  size?: number;
  accessibilityLabel: string;
  /** Replaces the icon with a spinner while work is in flight. */
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function IconButton({
  icon,
  onPress,
  color,
  iconSize = 'md',
  background,
  borderColor,
  shape = 'circle',
  size,
  accessibilityLabel,
  loading = false,
  disabled,
  testID,
}: IconButtonProps) {
  const theme = useTheme();
  const { layout, iconSizes } = useResponsive();
  const resolvedSize = size ?? layout.minTapTarget;
  const isDisabled = disabled || loading;
  const tint = color ?? theme.textPrimary;
  const spinnerColor = color ?? theme.accentPrimary;
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: isDisabled ? undefined : handlePress,
  });
  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={6}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: resolvedSize,
          height: resolvedSize,
          borderRadius: shape === 'rounded' ? radii.md : resolvedSize / 2,
          backgroundColor: background ?? theme.backgroundSunken,
          borderColor,
          borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled && !loading ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}>
      {loading ? (
        <LoadingSpinner size={Math.round(iconSizes.md * 0.95)} color={spinnerColor} />
      ) : (
        <Symbol name={icon} size={iconSize} color={tint} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
});
