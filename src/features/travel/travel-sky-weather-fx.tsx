import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import {
  SKY_PLATE_VIEWBOX,
  SKY_VIEW_H,
  SKY_VIEW_W,
} from '@/features/travel/travel-sky-plate';

const RAIN_DROPS = [
  { x: 18, delay: 0, len: 14, speed: 900 },
  { x: 42, delay: 120, len: 12, speed: 820 },
  { x: 68, delay: 40, len: 16, speed: 960 },
  { x: 96, delay: 200, len: 13, speed: 880 },
  { x: 124, delay: 80, len: 15, speed: 940 },
  { x: 152, delay: 160, len: 12, speed: 860 },
  { x: 180, delay: 30, len: 17, speed: 980 },
  { x: 208, delay: 220, len: 14, speed: 900 },
  { x: 236, delay: 90, len: 13, speed: 850 },
  { x: 264, delay: 140, len: 16, speed: 970 },
  { x: 292, delay: 60, len: 12, speed: 830 },
  { x: 320, delay: 180, len: 15, speed: 920 },
  { x: 348, delay: 100, len: 14, speed: 890 },
  { x: 55, delay: 250, len: 11, speed: 800 },
  { x: 155, delay: 70, len: 15, speed: 950 },
  { x: 255, delay: 190, len: 13, speed: 870 },
  { x: 330, delay: 110, len: 16, speed: 990 },
] as const;

function RainDrop({
  x,
  delay,
  len,
  speed,
  color,
}: {
  x: number;
  delay: number;
  len: number;
  speed: number;
  color: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: speed, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [delay, speed, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: t.value * (SKY_VIEW_H + len) - len },
    ],
    opacity: interpolate(t.value, [0, 0.15, 0.85, 1], [0.15, 0.55, 0.55, 0.12]),
  }));

  return (
    <Animated.View style={[styles.drop, { left: `${(x / SKY_VIEW_W) * 100}%` }, style]}>
      <Svg width={3} height={len} viewBox={`0 0 3 ${len}`}>
        <Line
          x1={1.5}
          y1={0}
          x2={1.5}
          y2={len}
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

function LightningBolt({
  delayMs,
  path,
}: {
  delayMs: number;
  path: string;
}) {
  const flash = useSharedValue(0);
  useEffect(() => {
    flash.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 2200 }),
          withTiming(1, { duration: 60 }),
          withTiming(0.2, { duration: 50 }),
          withTiming(1, { duration: 40 }),
          withTiming(0, { duration: 180 }),
          withTiming(0, { duration: 3200 + delayMs }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, flash]);

  const style = useAnimatedStyle(() => ({
    opacity: flash.value * 0.9,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={SKY_PLATE_VIEWBOX}
        preserveAspectRatio="none">
        <Path
          d={path}
          stroke="rgba(220,235,255,0.95)"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={path}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
          opacity={0.4}
        />
      </Svg>
    </Animated.View>
  );
}

/** Rain streaks + optional lightning for rain/storm header skies. */
export function TravelSkyWeatherFx({
  rain,
  lightning,
  dark,
}: {
  rain: boolean;
  lightning: boolean;
  dark: boolean;
}) {
  if (!rain && !lightning) return null;
  const dropColor = dark ? 'rgba(180,210,240,0.55)' : 'rgba(70,100,130,0.45)';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {rain
        ? RAIN_DROPS.map((drop, index) => (
            <RainDrop
              key={`rain-${index}`}
              x={drop.x}
              delay={drop.delay}
              len={drop.len}
              speed={drop.speed}
              color={dropColor}
            />
          ))
        : null}
      {lightning ? (
        <>
          <LightningBolt delayMs={400} path="M210 8 L198 42 L214 42 L196 88" />
          <LightningBolt delayMs={1800} path="M92 4 L84 36 L96 36 L78 72" />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    top: 0,
    marginLeft: -1.5,
  },
});
