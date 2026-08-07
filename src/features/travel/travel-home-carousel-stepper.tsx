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
const SLIDE_MS = 280;

/**
 * Page control etched into Travel Home glass — sliding luminous pill so the
 * active slide reads through the frost instead of sitting under it.
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

  const inactive = Math.max(6, s(6));
  const activeH = Math.max(7, s(travelHomeTokens.sizes.carouselActiveDot));
  const activeW = Math.max(16, s(18));
  const gap = Math.max(6, s(travelHomeTokens.sizes.carouselDotGap));
  const trackPadX = Math.max(8, s(9));
  const trackPadY = Math.max(6, s(7));
  const slotW = activeW;
  const trackW = pageCount * slotW + Math.max(0, pageCount - 1) * gap;
  const inactiveColor = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.34)';
  const pillColor = dark
    ? '#FFFFFF'
    : travelHomeTokens.colors.brandBlue;

  const progress = useSharedValue(activeIndex);

  useEffect(() => {
    progress.value = withTiming(activeIndex, {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeIndex, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    width: activeW,
    height: activeH,
    borderRadius: activeH / 2,
    transform: [{ translateX: progress.value * (slotW + gap) }],
    backgroundColor: pillColor,
    boxShadow: dark
      ? '0 0 12px rgba(255,255,255,0.45)'
      : '0 1px 8px rgba(47,111,237,0.45)',
  }));

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
      <View
        style={[
          styles.track,
          {
            paddingHorizontal: trackPadX,
            paddingVertical: trackPadY,
            borderRadius: 999,
            backgroundColor: dark
              ? 'rgba(0,0,0,0.28)'
              : 'rgba(255,255,255,0.38)',
            borderColor: dark
              ? 'rgba(255,255,255,0.28)'
              : 'rgba(255,255,255,0.85)',
          },
        ]}>
        <View style={{ width: trackW, height: activeH, justifyContent: 'center' }}>
          <View style={[styles.slots, { gap, height: activeH }]}>
            {Array.from({ length: pageCount }, (_, slot) => (
              <StepperSlot
                key={`step-${slot}`}
                slotWidth={slotW}
                dotSize={inactive}
                index={slot}
                progress={progress}
                color={inactiveColor}
              />
            ))}
          </View>
          <Animated.View style={[styles.pill, pillStyle]} />
        </View>
      </View>
    </View>
  );
}

function StepperSlot({
  slotWidth,
  dotSize,
  index,
  progress,
  color,
}: {
  slotWidth: number;
  dotSize: number;
  index: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      opacity: distance < 0.45 ? 0 : 0.85,
      backgroundColor: color,
    };
  });

  return (
    <View style={[styles.slot, { width: slotWidth }]}>
      <Animated.View style={dotStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapCollapsed: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  track: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  slots: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
