import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radii, spacing, typography } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...rest }: InputProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="overline" color="tertiary">
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textTertiary}
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: theme.backgroundSunken,
            color: theme.textPrimary,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  input: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
});
