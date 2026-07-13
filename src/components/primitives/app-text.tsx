import { Text, type TextProps, type TextStyle } from 'react-native';

import { typography, type TypeVariant } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent' | 'danger' | 'success';
  align?: TextStyle['textAlign'];
}

export function AppText({
  variant = 'body',
  color = 'primary',
  align,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const colorValue = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    accent: theme.accentPrimary,
    onAccent: theme.textOnAccent,
    danger: theme.danger,
    success: theme.success,
  }[color];

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      style={[typography[variant] as TextStyle, { color: colorValue }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
