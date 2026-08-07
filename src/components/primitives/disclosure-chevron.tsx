import { useEffect } from 'react';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Symbol, type SymbolSize } from '@/components/primitives/symbol';
import { easings, motion, type AppIconName } from '@/design-system';

type DisclosureChevronProps = {
  expanded: boolean;
  color: string;
  size?: SymbolSize | number;
  /**
   * `right-up` — collapsed points right, expanded points up (sections).
   * `down-up` — collapsed points down, expanded points up (menus).
   */
  variant?: 'right-up' | 'down-up';
};

/**
 * Rotates a chevron instead of swapping glyphs — continuous, no pop.
 */
export function DisclosureChevron({
  expanded,
  color,
  size = 'sm',
  variant = 'right-up',
}: DisclosureChevronProps) {
  const reduceMotion = useReducedMotion();
  const closedDeg = 0;
  const openDeg = variant === 'down-up' ? 180 : -90;
  const rotation = useSharedValue(expanded ? openDeg : closedDeg);
  const icon: AppIconName =
    variant === 'down-up' ? 'chevron-down' : 'chevron-right';

  useEffect(() => {
    rotation.value = withTiming(expanded ? openDeg : closedDeg, {
      duration: reduceMotion ? 0 : motion.chrome,
      easing: easings.standard,
      reduceMotion: ReduceMotion.System,
    });
  }, [expanded, openDeg, reduceMotion, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Symbol name={icon} size={size} color={color} />
    </Animated.View>
  );
}
