import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { durations, easings, motion } from '@/design-system';

type CollapsibleBodyProps = PropsWithChildren<{
  expanded: boolean;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Height + opacity disclosure for collapsing menus / card bodies.
 * Eases open/close (never hard-mount pops). Respects reduced motion.
 * Keeps controls tappable while open; disables hit testing while closing.
 *
 * Initially-expanded bodies stay in normal flow until the first toggle so
 * route pushes don't flash when the absolute measure path engages.
 *
 * Never returns null — a zero-height shell stays mounted so Fabric parents
 * (glass / chrome siblings) don't remount children mid-frame.
 */
export function CollapsibleBody({
  expanded,
  children,
  style,
}: CollapsibleBodyProps) {
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  const [animating, setAnimating] = useState(false);
  const progress = useSharedValue(expanded ? 1 : 0);
  const hasMeasured = height > 0;
  const wasExpanded = useRef(expanded);
  const [motionEnabled, setMotionEnabled] = useState(false);
  // Keep children mounted after first expand so reopen doesn't remount trees.
  const [keepMounted, setKeepMounted] = useState(expanded);

  useEffect(() => {
    if (wasExpanded.current === expanded) return;
    wasExpanded.current = expanded;
    setMotionEnabled(true);
  }, [expanded]);

  useEffect(() => {
    if (expanded) setKeepMounted(true);

    // Static open shell — keep progress synced without animating in.
    if (!motionEnabled && expanded) {
      progress.value = 1;
      return;
    }

    const duration = reduceMotion ? 0 : motion.disclosure;
    setAnimating(true);
    progress.value = withTiming(
      expanded ? 1 : 0,
      {
        duration,
        easing: expanded ? easings.enter : easings.exit,
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        if (!finished) return;
        runOnJS(setAnimating)(false);
      },
    );
  }, [expanded, reduceMotion, progress, motionEnabled]);

  const recordHeight = (next: number) => {
    if (next > 0 && Math.abs(next - height) > 1) {
      setHeight(next);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    // Numeric heights only — `undefined` in worklets has crashed Reanimated/Fabric.
    return {
      height: height * progress.value,
      opacity: progress.value,
      overflow: 'hidden' as const,
    };
  }, [height]);

  // Open without a measured height yet (first paint or first expand): normal
  // flow so layout can report a height — never animate from an unknown size.
  if (expanded && !hasMeasured) {
    return (
      <View
        style={style}
        onLayout={(event) => {
          recordHeight(Math.ceil(event.nativeEvent.layout.height));
        }}>
        {children}
      </View>
    );
  }

  // Settled open: drop the height clamp so content can grow without a second
  // measure pass fighting layout (notes, timeline cards, etc.).
  if (!animating && expanded) {
    return (
      <View
        style={style}
        onLayout={(event) => {
          recordHeight(Math.ceil(event.nativeEvent.layout.height));
        }}>
        {children}
      </View>
    );
  }

  // Collapsed before first open — keep a zero-height Fabric shell mounted.
  if (!keepMounted) {
    return <View style={[styles.clip, styles.collapsedShell, style]} />;
  }

  // Pin while animating or collapsing so absolute measure + clip height engage
  // together (avoids a 0-height frame when measure first attaches).
  const pinMeasure = animating || !expanded;

  return (
    <Animated.View
      style={[styles.clip, animatedStyle, style]}
      pointerEvents={expanded ? 'auto' : 'none'}>
      <View
        // Pin to natural height only while the clip is animating so open
        // content can reflow; absolute children would collapse the parent
        // for a frame when measure first engages (route-push flash).
        style={pinMeasure ? styles.measure : styles.flow}
        onLayout={(event) => {
          recordHeight(Math.ceil(event.nativeEvent.layout.height));
        }}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    width: '100%',
  },
  collapsedShell: {
    height: 0,
    overflow: 'hidden',
  },
  flow: {
    width: '100%',
  },
  measure: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

/** Layout reflow token for lists that expand/collapse siblings. */
export const collapsibleLayoutTransition = {
  duration: motion.layout,
  easing: easings.standard,
} as const;

export const collapsibleFadeMs = durations.fast;
