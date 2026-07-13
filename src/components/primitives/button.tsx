import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { layout, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';
import { AppText } from './app-text';
import { Symbol } from './symbol';

interface ButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  icon?: SymbolViewProps['name'];
  disabled?: boolean;
  style?: ViewStyle;
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
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();

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
        size === 'lg' && styles.lg,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {icon ? <Symbol name={icon} size="sm" color={iconColor} /> : null}
      <AppText variant={size === 'lg' ? 'subheading' : 'callout'} color={textColor}>
        {children}
      </AppText>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: SymbolViewProps['name'];
  onPress: () => void;
  color?: string;
  background?: string;
  size?: number;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  color,
  background,
  size = layout.minTapTarget,
  accessibilityLabel,
  disabled,
}: IconButtonProps) {
  const theme = useTheme();
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
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background ?? theme.backgroundSunken,
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
    gap: spacing.sm,
    minHeight: layout.minTapTarget,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  lg: {
    paddingVertical: spacing.lg,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
