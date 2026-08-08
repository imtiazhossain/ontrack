import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useResponsive } from '@/hooks/use-responsive';

type TravelHomeCarouselStepperProps = {
  count: number;
  index: number;
  /** Continuous page position from the hero ScrollView (0…count-1). */
  progress?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
};

const MAX_SLOTS = 3;
const SETTLE_MS = 220;
const TICK_RADIUS = 1.5;
const ACTIVE = '#FFFFFF';
const INACTIVE = 'rgba(255,255,255,0.45)';

/** Fabric-safe shell: never return null near BlurView / glass siblings. */
const SHELL = {
  collapsable: false,
  pointerEvents: 'none',
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * Compact page ticks for Travel Home heroes.
 * Tracks scroll progress; dark plate keeps white ticks readable on pale sky.
 * Collapse (don’t unmount) when ≤1 page — Fabric remount near BlurView SIGABRTs.
 */
export function TravelHomeCarouselStepper({
  count,
  index,
  progress: progressProp,
  style,
}: TravelHomeCarouselStepperProps) {
  const { s } = useResponsive();
  const pageCount = Math.max(0, Math.min(MAX_SLOTS, count));
  const activeIndex = Math.max(0, Math.min(Math.max(pageCount - 1, 0), index));
  const visible = pageCount > 1;

  const lineW = Math.max(8, s(8.5));
  const lineH = Math.max(1.75, s(2));
  const gap = Math.max(3, s(3.5));
  const padY = Math.max(3, s(3));
  const padX = Math.max(5, s(5.5));
  const plateRadius = Math.max(6, s(7));

  const fallbackProgress = useSharedValue(activeIndex);
  const progress = progressProp ?? fallbackProgress;

  useEffect(() => {
    // Discrete index only, or non-gesture jumps (reload/clamp): ease settle.
    if (progressProp) {
      if (Math.abs(progressProp.value - activeIndex) > 0.01) {
        progressProp.value = withTiming(activeIndex, { duration: SETTLE_MS });
      }
      return;
    }
    fallbackProgress.value = withTiming(activeIndex, { duration: SETTLE_MS });
  }, [activeIndex, fallbackProgress, progressProp]);

  if (!visible) {
    return <View {...SHELL} style={[styles.wrapCollapsed, style]} />;
  }

  return (
    <View {...SHELL} style={[styles.wrap, style]}>
      <View
        style={[
          styles.plate,
          {
            paddingHorizontal: padX,
            paddingVertical: padY,
            borderRadius: plateRadius,
            gap,
          },
        ]}>
        {Array.from({ length: pageCount }, (_, slot) => (
          <Tick
            key={slot}
            index={slot}
            progress={progress}
            width={lineW}
            height={lineH}
          />
        ))}
      </View>
    </View>
  );
}

function Tick({
  index,
  progress,
  width,
  height,
}: {
  index: number;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  const activeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Static inactive fill first — animated opacity alone stayed blank until
  // the first shared-value update (swipe).
  return (
    <View
      style={{
        width,
        height,
        borderRadius: TICK_RADIUS,
        backgroundColor: INACTIVE,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: ACTIVE, borderRadius: TICK_RADIUS },
          activeStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  wrapCollapsed: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
});
