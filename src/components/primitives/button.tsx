import type { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

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
  size?: 'sm' | 'md' | 'lg';
  shape?: 'pill' | 'rounded';
  icon?: AppIconName;
  leading?: ReactNode;
  /** Replaces the leading icon with a spinner while work is in flight. */
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  shape = 'pill',
  icon,
  leading,
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
    try {
      haptics.tap();
    } catch {
      // Best-effort haptics should never block the button action.
    }
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
          borderRadius: shape === 'rounded' ? radii.md : radii.pill,
          borderCurve: 'continuous',
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          paddingVertical: size === 'lg' ? spacing.lg : size === 'sm' ? spacing.sm : spacing.md,
          opacity: isDisabled && !loading ? 0.4 : pressed ? 0.75 : 1,
          backgroundColor: background,
        },
        style,
      ]}>
      {loading ? (
        <LoadingSpinner size={iconSizes.sm} color={iconColor} />
      ) : leading ? (
        leading
      ) : icon ? (
        <Symbol name={icon} size="sm" color={iconColor} />
      ) : null}
      <AppText
        variant={size === 'lg' ? 'subheading' : size === 'sm' ? 'caption' : 'callout'}
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
  const resolvedHitSlop = Math.max(6, (layout.minTapTarget - resolvedSize) / 2);
  const isDisabled = disabled || loading;
  const tint = color ?? theme.textPrimary;
  const spinnerColor = color ?? theme.accentPrimary;
  const handlePress = () => {
    try {
      haptics.tap();
    } catch {
      // Best-effort haptics should never block the button action.
    }
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
      hitSlop={resolvedHitSlop}
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
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
});
