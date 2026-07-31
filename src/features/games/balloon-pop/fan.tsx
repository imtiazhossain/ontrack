import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

import type { FanSide } from './types';

interface FanProps {
  side: FanSide;
  strength: number;
}

const FAN_SIZE = 44;

export function EdgeFan({ side, strength }: FanProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(spin);
      spin.set(0);
      return;
    }
    const duration = Math.max(400, 1400 - strength * 4);
    spin.set(0);
    spin.set(
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(spin);
  }, [reducedMotion, spin, strength]);

  const bladeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));

  const positionStyle = (() => {
    switch (side) {
      case 'left':
        return { left: spacing.xs, top: '50%' as const, marginTop: -FAN_SIZE / 2 };
      case 'right':
        return { right: spacing.xs, top: '50%' as const, marginTop: -FAN_SIZE / 2 };
      case 'top':
        return { top: spacing.xs, left: '50%' as const, marginLeft: -FAN_SIZE / 2 };
      case 'bottom':
        return { bottom: spacing.xs, left: '50%' as const, marginLeft: -FAN_SIZE / 2 };
    }
  })();

  const windHint =
    side === 'left' ? '→' : side === 'right' ? '←' : side === 'top' ? '↓' : '↑';

  return (
    <View pointerEvents="none" style={[styles.fan, positionStyle]}>
      <Animated.View
        style={[
          styles.housing,
          { backgroundColor: theme.backgroundElevated, borderColor: theme.separator },
          bladeStyle,
        ]}>
        <View style={[styles.blade, { backgroundColor: theme.accentPrimary }]} />
        <View
          style={[
            styles.blade,
            styles.bladeCross,
            { backgroundColor: theme.accentSoft },
          ]}
        />
      </Animated.View>
      <AppText variant="caption" color="secondary" style={styles.hint}>
        {windHint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fan: {
    position: 'absolute',
    width: FAN_SIZE,
    alignItems: 'center',
    zIndex: 2,
  },
  housing: {
    width: FAN_SIZE,
    height: FAN_SIZE,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blade: {
    position: 'absolute',
    width: 6,
    height: FAN_SIZE * 0.72,
    borderRadius: 3,
  },
  bladeCross: {
    transform: [{ rotate: '90deg' }],
    opacity: 0.85,
  },
  hint: {
    marginTop: 2,
  },
});
