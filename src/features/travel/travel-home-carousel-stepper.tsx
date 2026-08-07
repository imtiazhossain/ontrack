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
 * Compact page ticks for Travel Home heroes — small thin lines overlaid on the
 * visible hero band, just above the glass scoop (one per swipeable thumbnail).
 *
 * Active highlight tracks scroll progress for a smooth crossfade while swiping.
 * Each tick keeps a static inactive fill so lines paint on first frame (animated
 * styles alone used to stay invisible until the first swipe).
 *
 * Always mount a shell (collapse when ≤1 page) so Fabric siblings of BlurView
 * / glass underlays don’t remount mid-frame.
 *
 * On-image chrome: light ticks + soft shadow so they read on bright or dark
 * destination plates.
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

  const lineW = Math.max(12, s(13));
  const lineH = Math.max(2, s(2));
  const gap = Math.max(4, s(5));
  const padY = Math.max(3, s(3));
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
      style={[styles.wrap, { paddingTop: padY }, style]}>
      <View
        style={[
          styles.row,
          {
            gap,
            height: lineH,
            // Soft lift so white ticks stay readable on pale sky / bright plates.
            shadowColor: '#000',
            shadowOpacity: 0.45,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
