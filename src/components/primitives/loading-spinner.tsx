import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

interface LoadingSpinnerProps {
  /** Outer diameter in points. */
  size?: number;
  /** Ring stroke width. */
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  accessibilityLabel?: string;
}

/** Indeterminate ring spinner for inline icon/button loading states. */
export function LoadingSpinner({
  size = 20,
  strokeWidth,
  color,
  trackColor,
  accessibilityLabel = 'Loading',
}: LoadingSpinnerProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const stroke = strokeWidth ?? Math.max(2.5, size * 0.14);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.68;
  const ringColor = color ?? theme.accentPrimary;
  const ringTrack = trackColor ?? `${ringColor}33`;

  useEffect(() => {
    if (reduceMotion) {
      rotation.set(0);
      return;
    }
    rotation.set(0);
    rotation.set(
      withRepeat(
        withTiming(360, { duration: 850, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [reduceMotion, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringTrack}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${arc} ${circumference}`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
