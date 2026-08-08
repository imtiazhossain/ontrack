import type { PropsWithChildren } from 'react';
import {
    Pressable,
    StyleSheet,
    View,
    type LayoutChangeEvent,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { radii, shadows, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { GlassPlate } from './glass-plate';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  onLongPress?: () => void;
  /** elevated = frosted raised plate, sunken = lighter airy frost */
  variant?: 'elevated' | 'sunken';
  /**
   * `glass` = frosted plate (app default). `solid` = opaque elevated/sunken paper.
   */
  surface?: 'solid' | 'glass';
  /** Lighter frost so scenic / gradient underlays stay visible. */
  airy?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export function Card({
  children,
  onPress,
  onLongPress,
  variant = 'elevated',
  surface = 'glass',
  airy = false,
  padded = true,
  style,
  accessibilityLabel,
  testID,
  onLayout,
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
  const glass = surface === 'glass';
  const padStyle = padded ? { padding: spacing.lg } : { overflow: 'hidden' as const };
  const radiusStyle = {
    borderRadius: radii.lg,
    borderCurve: 'continuous' as const,
  };

  const solidBase: ViewStyle = {
    ...radiusStyle,
    backgroundColor:
      variant === 'elevated' ? theme.backgroundElevated : theme.backgroundSunken,
    ...(variant === 'elevated' ? shadows.card : null),
    ...padStyle,
  };

  const content = children;
  const layoutHandler = (event: LayoutChangeEvent) => {
    agent.onLayout?.(event);
    onLayout?.(event);
  };

  if (glass) {
    // Sunken = airy frost (not clear/wash paper). Explicit `airy` also frosts elevated.
    const useAiry = airy || variant === 'sunken';
    const plate = (
      <GlassPlate
        airy={useAiry}
        style={[
          styles.glassCard,
          radiusStyle,
          variant === 'elevated' && !useAiry ? shadows.card : null,
          padStyle,
          style,
        ]}>
        {content}
      </GlassPlate>
    );

    if (!onPress && !onLongPress) {
      return (
        <View
          ref={agent.ref}
          testID={testID}
          onLayout={layoutHandler}
          collapsable={false}>
          {plate}
        </View>
      );
    }

    return (
      <Pressable
        ref={agent.ref}
        testID={testID}
        onLayout={layoutHandler}
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
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        {plate}
      </Pressable>
    );
  }

  if (!onPress && !onLongPress) {
    return (
      <View
        ref={agent.ref}
        testID={testID}
        onLayout={layoutHandler}
        style={[solidBase, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={layoutHandler}
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
      style={({ pressed }) => [solidBase, { opacity: pressed ? 0.85 : 1 }, style]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    width: '100%',
  },
});
