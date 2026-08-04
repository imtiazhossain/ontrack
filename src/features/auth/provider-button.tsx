import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/primitives';
import { radii, spacing } from '@/design-system';

export function ProviderButton({
  children,
  icon,
  onPress,
  disabled,
  backgroundColor,
  borderColor,
  textColor,
  accessibilityLabel,
  testID,
}: PropsWithChildren<{
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  accessibilityLabel: string;
  testID?: string;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
      ]}>
      {icon}
      <AppText variant="bodyMedium" style={{ color: textColor }}>
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    width: '100%',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
