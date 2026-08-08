import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { durations, easings, radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';

/** Chrome settle — short enough to feel snappy, long enough to read as a blend. */
const SELECT_MS = durations.fast;

type BottomNavTabItemProps = {
  selected: boolean;
  icon: AppIconName;
  label: string;
  activeColor: string;
  inactiveColor: string;
  iconSize: number;
  captionStyle: {
    fontSize: number;
    lineHeight: number;
    width: '100%';
    minWidth: number;
    flexShrink: number;
  };
  badge?: number;
  badgeColor: string;
  badgeMinWidth: number;
  badgeHeight: number;
  badgePadX: number;
  badgeFontSize: number;
  badgeLineHeight: number;
};

/**
 * One bottom-nav slot’s icon + caption. Selection accent eases on the label;
 * icon tint stays discrete (cheap on the infinite repeat track). The active
 * indicator is a fixed center dot on the rail — not per-item — so icons move
 * under a stationary mark.
 */
export function BottomNavTabItem({
  selected,
  icon,
  label,
  activeColor,
  inactiveColor,
  iconSize,
  captionStyle,
  badge = 0,
  badgeColor,
  badgeMinWidth,
  badgeHeight,
  badgePadX,
  badgeFontSize,
  badgeLineHeight,
}: BottomNavTabItemProps) {
  const { typography } = useResponsive();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {
      duration: reduceMotion ? 0 : SELECT_MS,
      easing: easings.standard,
    });
  }, [progress, reduceMotion, selected]);

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor],
    ),
  }));

  return (
    <>
      <View style={styles.iconSlot}>
        <Symbol
          name={icon}
          size={iconSize}
          color={selected ? activeColor : inactiveColor}
        />
        {badge > 0 ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor,
                minWidth: badgeMinWidth,
                height: badgeHeight,
                paddingHorizontal: badgePadX,
              },
            ]}>
            <Text
              style={[
                styles.badgeText,
                { fontSize: badgeFontSize, lineHeight: badgeLineHeight },
              ]}>
              {badge > 99 ? '99+' : String(badge)}
            </Text>
          </View>
        ) : null}
      </View>
      <Animated.Text
        allowFontScaling
        maxFontSizeMultiplier={1.1}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.68}
        style={[
          typography.caption,
          captionStyle,
          styles.caption,
          { fontWeight: selected ? '600' : '400' },
          labelStyle,
        ]}>
        {label}
      </Animated.Text>
    </>
  );
}

const styles = StyleSheet.create({
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
});
