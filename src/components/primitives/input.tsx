import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

interface InputProps extends TextInputProps {
  label?: string;
  trailing?: ReactNode;
}

export function Input({ label, style, trailing, ...rest }: InputProps) {
  const theme = useTheme();
  const { typography, spacing, s } = useResponsive();
  return (
    <View style={[styles.wrapper, { gap: spacing.sm }]}>
      {label ? (
        <AppText variant="overline" color="tertiary" fit>
          {label}
        </AppText>
      ) : null}
      <View style={styles.field}>
        <TextInput
          placeholderTextColor={theme.textTertiary}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          style={[
            {
              borderRadius: radii.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              minHeight: Math.max(44, s(48)),
            },
            trailing ? { paddingRight: s(56) } : null,
            typography.body,
            {
              backgroundColor: theme.backgroundSunken,
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
  trailing: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
