import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radii, spacing, typography } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

interface InputProps extends TextInputProps {
  label?: string;
  trailing?: ReactNode;
}

export function Input({ label, style, trailing, ...rest }: InputProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="overline" color="tertiary">
          {label}
        </AppText>
      ) : null}
      <View style={styles.field}>
        <TextInput
          placeholderTextColor={theme.textTertiary}
          style={[
            styles.input,
            trailing ? styles.inputWithTrailing : null,
            typography.body,
            {
              backgroundColor: theme.backgroundSunken,
              color: theme.textPrimary,
            },
            style,
          ]}
          {...rest}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  field: {
    position: 'relative',
  },
  input: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputWithTrailing: {
    paddingRight: 56,
  },
  trailing: {
    position: 'absolute',
    right: spacing.xs,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
