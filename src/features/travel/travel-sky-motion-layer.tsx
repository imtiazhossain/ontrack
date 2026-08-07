import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export type SkyMotionLayerProps = {
  depth: number;
  energy: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  delayMs?: number;
  /** Horizontal drift amplitude in plate px (0 = tilt-only). */
  driftAmp?: number;
  /** One-way drift duration ms; higher = lazier clouds. */
  driftMs?: number;
  /**
   * Day plates breathe layer opacity; night keeps a stable lift so per-star
   * shimmer carries the sparkle without a lockstep pulse.
   */
  opacityMode?: 'breathe' | 'stable';
  tiltXAmp?: number;
  tiltYAmp?: number;
  driftYAmp?: number;
  children: ReactNode;
};

/**
 * Shared parallax + optional glide wrapper for itinerary day/night sky plates.
 */
export function SkyMotionLayer({
  depth,
  energy,
  tiltX,
  tiltY,
  delayMs = 0,
  driftAmp = 0,
  driftMs = 28000,
  opacityMode = 'breathe',
  tiltXAmp = 14,
  tiltYAmp = 9,
  driftYAmp = 1.2,
  children,
}: SkyMotionLayerProps) {
  const idle = useSharedValue(opacityMode === 'breathe' ? 0.72 : 1);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (opacityMode !== 'breathe') return;
    idle.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.65, {
            duration: 2400,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, idle, opacityMode]);

  useEffect(() => {
    if (driftAmp <= 0) return;
    drift.value = 0;
    drift.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: driftMs,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: driftMs,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, drift, driftAmp, driftMs]);

  const style = useAnimatedStyle(() => {
    const opacity =
      opacityMode === 'breathe'
        ? interpolate(energy.value, [0, 1], [idle.value, 1])
        : interpolate(energy.value, [0, 1], [0.94, 1]);
    const glide =
      driftAmp > 0
        ? interpolate(drift.value, [0, 1], [-driftAmp, driftAmp])
        : 0;
    const glideY =
      driftAmp > 0
        ? interpolate(drift.value, [0, 1], [-driftYAmp, driftYAmp]) * depth
        : 0;
    return {
      opacity,
      transform: [
        { translateX: tiltX.value * tiltXAmp * depth + glide },
        { translateY: tiltY.value * tiltYAmp * depth + glideY },
      ],
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

/** Local alias kept so day/night source contracts still see `MotionLayer`. */
export const MotionLayer = SkyMotionLayer;
