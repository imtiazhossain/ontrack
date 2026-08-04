import type { PropsWithChildren } from 'react';
import {
  Pressable,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

type SocialPressableProps = PropsWithChildren<{
  testID: string;
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityState?: AccessibilityState;
}>;

/** Tracked Social press target with consistent haptics and pressed feedback. */
export function SocialPressable({
  testID,
  accessibilityLabel,
  onPress,
  style,
  disabled,
  accessibilityState,
  children,
}: SocialPressableProps) {
  const handlePress = () => {
    haptics.select();
    onPress();
  };
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: disabled ? undefined : handlePress,
  });

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        style,
        {
          opacity: disabled ? 0.4 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        },
      ]}>
      {children}
    </Pressable>
  );
}
