import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';
import { AppText } from './app-text';
import { Symbol } from './symbol';

interface ButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  icon?: AppIconName;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const { spacing, layout } = useResponsive();

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          gap: spacing.sm,
          minHeight: layout.minTapTarget,
          paddingHorizontal: spacing.xl,
          paddingVertical: size === 'lg' ? spacing.lg : spacing.md,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          backgroundColor: background,
        },
        style,
      ]}>
      {icon ? <Symbol name={icon} size="sm" color={iconColor} /> : null}
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
  background?: string;
  borderColor?: string;
  shape?: 'circle' | 'rounded';
  size?: number;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  color,
  background,
  borderColor,
  shape = 'circle',
  size,
  accessibilityLabel,
  disabled,
}: IconButtonProps) {
  const theme = useTheme();
  const { layout } = useResponsive();
  const resolvedSize = size ?? layout.minTapTarget;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: resolvedSize,
          height: resolvedSize,
          borderRadius: shape === 'rounded' ? radii.md : resolvedSize / 2,
          backgroundColor: background ?? theme.backgroundSunken,
          borderColor,
          borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}>
      <Symbol name={icon} size="md" color={color ?? theme.textPrimary} />
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
