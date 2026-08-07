import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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

/**
 * Compact page ticks for Travel Home heroes — thin lines overlaid at the top
 * of the visible hero band (one per swipeable thumbnail).
 *
 * Active highlight tracks scroll progress for a smooth crossfade while swiping.
 * A dark capsule behind the ticks keeps them readable on bright sky / roofs
 * (white-on-pale ticks used to vanish until the user swiped to a darker plate).
 *
 * Always mount a shell (collapse when ≤1 page) so Fabric siblings of BlurView
 * / glass underlays don’t remount mid-frame.
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

  const lineW = Math.max(6, s(7));
  const lineH = Math.max(1.25, s(1.5));
  const gap = Math.max(2, s(2.5));
  const padY = Math.max(2, s(2));
  const padX = Math.max(4, s(4.5));
  const inactiveColor = 'rgba(255,255,255,0.45)';
  const activeColor = '#FFFFFF';

  const fallbackProgress = useSharedValue(activeIndex);
  const progress = progressProp ?? fallbackProgress;

  // When the parent only passes discrete index (no scroll binding), ease over.
  useEffect(() => {
    if (progressProp) {
      // Keep shared scroll value in sync for non-gesture jumps (reload, clamp).
      if (Math.abs(progressProp.value - activeIndex) > 0.01) {
        progressProp.value = withTiming(activeIndex, { duration: SETTLE_MS });
      }
      return;
    }
    fallbackProgress.value = withTiming(activeIndex, { duration: SETTLE_MS });
  }, [activeIndex, fallbackProgress, progressProp]);

  if (!visible) {
    return (
      <View
        collapsable={false}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.wrapCollapsed, style]}
      />
    );
  }

  return (
    <View
      collapsable={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, style]}>
      {/*
        Dark plate so white ticks stay legible on pale sky / snow / bright roofs
        without waiting for a swipe onto a darker hero.
      */}
      <View
        style={[
          styles.plate,
          {
            paddingHorizontal: padX,
            paddingVertical: padY,
            borderRadius: Math.max(5, s(6)),
            gap,
          },
        ]}>
        {Array.from({ length: pageCount }, (_, slot) => (
          <Tick
            key={`tick-${slot}`}
            index={slot}
            progress={progress}
            width={lineW}
            height={lineH}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
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
  activeColor,
  inactiveColor,
}: {
  index: number;
  progress: SharedValue<number>;
  width: number;
  height: number;
  activeColor: string;
  inactiveColor: string;
}) {
  const activeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    // Static inactive fill paints on the first frame — animated styles alone
    // used to stay blank until the first shared-value update (swipe).
    <View
      style={{
        width,
        height,
        borderRadius: 1,
        backgroundColor: inactiveColor,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: activeColor, borderRadius: 1 },
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
