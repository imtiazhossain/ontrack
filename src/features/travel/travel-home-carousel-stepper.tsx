import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { travelHomeTokens } from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type TravelHomeCarouselStepperProps = {
  count: number;
  index: number;
  style?: StyleProp<ViewStyle>;
};

const MAX_SLOTS = 3;
const SLIDE_MS = 220;

/**
 * Compact page ticks for Travel Home heroes — small thin lines, centered on
 * the top edge of the glass scoop (one per swipeable thumbnail).
 *
 * Always mount a shell (collapse when ≤1 page) so Fabric siblings of BlurView
 * / glass underlays don’t remount mid-frame.
 */
export function TravelHomeCarouselStepper({
  count,
  index,
  style,
}: TravelHomeCarouselStepperProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const dark = theme.name === 'dark';
  const pageCount = Math.max(0, Math.min(MAX_SLOTS, count));
  const activeIndex = Math.max(0, Math.min(Math.max(pageCount - 1, 0), index));
  const visible = pageCount > 1;

  const lineW = Math.max(12, s(13));
  const lineH = StyleSheet.hairlineWidth * 2;
  const gap = Math.max(4, s(5));
  // Sit on the top edge of the glass scoop — only a hair of inset.
  const padY = Math.max(3, s(3));
  const inactiveColor = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.28)';
  const activeColor = dark ? '#FFFFFF' : travelHomeTokens.colors.brandBlue;

  const progress = useSharedValue(activeIndex);

  useEffect(() => {
    progress.value = withTiming(activeIndex, {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeIndex, progress]);

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
      <View style={[styles.row, { gap, height: lineH }]}>
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
  const style = useAnimatedStyle(() => {
    const on = Math.abs(progress.value - index) < 0.45;
    return {
      backgroundColor: on ? activeColor : inactiveColor,
      opacity: on ? 1 : 0.85,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height: Math.max(1.5, height),
          borderRadius: 1,
        },
        style,
      ]}
    />
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
