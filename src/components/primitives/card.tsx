import type { PropsWithChildren } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { radii, shadows, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  onLongPress?: () => void;
  /** elevated = white/raised, sunken = inset panel */
  variant?: 'elevated' | 'sunken';
  padded?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({
  children,
  onPress,
  onLongPress,
  variant = 'elevated',
  padded = true,
  style,
  accessibilityLabel,
  testID,
}: CardProps) {
  const theme = useTheme();
  const handlePress = onPress
    ? () => {
        haptics.select();
        onPress();
      }
    : undefined;
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: handlePress,
  });
  const base: ViewStyle = {
    borderRadius: radii.lg,
    backgroundColor: variant === 'elevated' ? theme.backgroundElevated : theme.backgroundSunken,
    ...(variant === 'elevated' ? shadows.card : null),
    ...(padded ? { padding: spacing.lg } : { overflow: 'hidden' as const }),
  };

  if (!onPress && !onLongPress) {
    return (
      <View ref={agent.ref} testID={testID} onLayout={agent.onLayout} style={[base, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      onLongPress={
        onLongPress
          ? () => {
              haptics.tap();
              onLongPress();
            }
          : undefined
      }
      style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>
      {children}
    </Pressable>
  );
}
