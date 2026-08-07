import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import {
  approximateLatitudeForDestination,
  dimFieldStars,
  moonPhaseCycle,
  projectStarsToPlate,
} from '@/features/travel/travel-sky-astronomy';
import { destinationShowsAurora } from '@/features/travel/travel-sky-aurora-destinations';
import { TravelSkyAurora } from '@/features/travel/travel-sky-aurora';
import type { HeaderSkyCondition } from '@/features/travel/travel-sky-condition';
import { PhaseMoon } from '@/features/travel/travel-phase-moon';
import {
  SKY_CELESTIAL_CLEARANCE,
  SKY_PLATE_VIEWBOX,
  SKY_VIEW_H,
  SKY_VIEW_W,
} from '@/features/travel/travel-sky-plate';
import { TravelSkyWeatherFx } from '@/features/travel/travel-sky-weather-fx';
import type { TiltSkyMotion } from '@/features/travel/use-tilt-sky-motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function MotionLayer({
  depth,
  energy,
  tiltX,
  tiltY,
  driftAmp = 0,
  driftMs = 32000,
  delayMs = 0,
  children,
}: {
  depth: number;
  energy: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  driftAmp?: number;
  driftMs?: number;
  delayMs?: number;
  children: ReactNode;
}) {
  const drift = useSharedValue(0);
  useEffect(() => {
    if (driftAmp <= 0) return;
    drift.value = 0;
    drift.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: driftMs, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: driftMs, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, drift, driftAmp, driftMs]);

  // Stable plate opacity — per-star shimmer carries the sparkle; a layer-wide
  // breathe made the whole field pulse in lockstep. Clouds optionally glide.
  const style = useAnimatedStyle(() => {
    const lift = interpolate(energy.value, [0, 1], [0.94, 1]);
    const glide = driftAmp > 0 ? interpolate(drift.value, [0, 1], [-driftAmp, driftAmp]) : 0;
    return {
      opacity: lift,
      transform: [
        { translateX: tiltX.value * 16 * depth + glide },
        {
          translateY:
            tiltY.value * 10 * depth +
            (driftAmp > 0 ? interpolate(drift.value, [0, 1], [-1, 1]) * depth : 0),
        },
      ],
    };
  });

  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** Deterministic 0…1 from a small integer seed (no Math in worklets). */
function starSeedUnit(seed: number, salt: number): number {
  const n = (seed * 7919 + salt * 104729) % 10007;
  return (n < 0 ? n + 10007 : n) / 10007;
}

/**
 * Independent opacity flashes — quick rise/fall with long, varied rests.
 * No radius breathe (that reads as a synchronized pulse).
 */
function TwinklingStar({
  cx,
  cy,
  r,
  seed,
  baseOpacity,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  seed: number;
  baseOpacity: number;
  color: string;
}) {
  const shimmer = useSharedValue(0);
  const delayMs = Math.round(starSeedUnit(seed, 1) * 5200);
  const holdMs = Math.round(1600 + starSeedUnit(seed, 2) * 6400);
  const flashUpMs = Math.round(140 + starSeedUnit(seed, 3) * 260);
  const flashDownMs = Math.round(220 + starSeedUnit(seed, 4) * 380);
  const peak = 0.55 + starSeedUnit(seed, 5) * 0.45;
  const doubleFlash = seed % 7 === 0 || seed % 11 === 0;

  useEffect(() => {
    const gapMs = Math.round(60 + starSeedUnit(seed, 6) * 140);
    const cycle = doubleFlash
      ? withSequence(
          withTiming(0, { duration: holdMs }),
          withTiming(peak, {
            duration: flashUpMs,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: flashDownMs,
            easing: Easing.in(Easing.quad),
          }),
          withTiming(0, { duration: gapMs }),
          withTiming(peak * 0.72, {
            duration: Math.round(flashUpMs * 0.75),
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: Math.round(flashDownMs * 0.9),
            easing: Easing.in(Easing.quad),
          }),
        )
      : withSequence(
          withTiming(0, { duration: holdMs }),
          withTiming(peak, {
            duration: flashUpMs,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: flashDownMs,
            easing: Easing.in(Easing.quad),
          }),
        );

    shimmer.value = withDelay(delayMs, withRepeat(cycle, -1, false));
  }, [
    delayMs,
    doubleFlash,
    flashDownMs,
    flashUpMs,
    holdMs,
    peak,
    seed,
    shimmer,
  ]);

  const animatedProps = useAnimatedProps(() => ({
    // Soft floor → brief sparkle; radius stays fixed.
    opacity: baseOpacity * (0.78 + shimmer.value * 0.22),
  }));

  return (
    <AnimatedCircle cx={cx} cy={cy} r={r} fill={color} animatedProps={animatedProps} />
  );
}

function Satellite({
  pathY,
  delayMs,
  duration,
  color,
  tiltY,
}: {
  pathY: number;
  delayMs: number;
  duration: number;
  color: string;
  tiltY: SharedValue<number>;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.linear }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 4000 }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, duration, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.08, 0.9, 1], [0, 0.85, 0.85, 0]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [-20, SKY_VIEW_W + 20]) },
      { translateY: pathY + tiltY.value * 6 },
    ],
  }));

  return (
    <Animated.View style={[styles.streak, style]}>
      <Svg width={18} height={8} viewBox="0 0 18 8">
        <Path d="M2 4 H6 M12 4 H16" stroke={color} strokeWidth={1} opacity={0.7} />
        <Circle cx={9} cy={4} r={2.2} fill={color} />
        <Circle cx={9} cy={4} r={1} fill="rgba(255,255,255,0.9)" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Occasional meteor streak for clear nights — brighter and more frequent
 * over dark-sky (desert) destinations.
 */
function ShootingStar({
  startX,
  startY,
  dx,
  dy,
  delayMs,
  pauseMs,
  bright,
}: {
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  delayMs: number;
  pauseMs: number;
  bright: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 850, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: pauseMs }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, pauseMs, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.7, 1], [0, bright, bright * 0.8, 0]),
    transform: [
      { translateX: startX + t.value * dx },
      { translateY: startY + t.value * dy },
      { rotate: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.streak, style]}>
      <Svg width={34} height={4} viewBox="0 0 34 4">
        <Line
          x1={0}
          y1={2}
          x2={30}
          y2={2}
          stroke="rgba(210,228,255,0.5)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <Line
          x1={20}
          y1={2}
          x2={32}
          y2={2}
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

export function TravelSkyNight({
  condition,
  destination,
  dateKey,
  latitude,
  longitude,
  statusBand,
  motion,
}: {
  condition: HeaderSkyCondition;
  destination: string;
  dateKey: string;
  latitude?: number;
  longitude?: number;
  statusBand: number;
  motion: TiltSkyMotion;
}) {
  const now = useMemo(() => new Date(), []);
  const cycle = useMemo(() => moonPhaseCycle(now), [now]);
  const showAurora =
    destinationShowsAurora(destination) && !condition.lightning;

  const lat = latitude ?? approximateLatitudeForDestination(destination);
  const cloudy = condition.cloudyNight;
  const desert = condition.accents.desert;

  const stars = useMemo(
    () =>
      projectStarsToPlate({
        date: now,
        latitude: lat,
        longitude,
        viewW: SKY_VIEW_W,
        viewH: SKY_VIEW_H,
        cloudy,
      }),
    [cloudy, lat, longitude, now],
  );
  const dimStars = useMemo(
    () =>
      dimFieldStars(
        SKY_VIEW_W,
        SKY_VIEW_H,
        `${destination}|${dateKey}`,
        cloudy,
        desert,
      ),
    [cloudy, dateKey, desert, destination],
  );

  const starOpacityMul =
    (condition.rain ? 0.4 : 1) * (showAurora ? 0.85 : 1) * (desert ? 1.12 : 1);
  const clearSky = !condition.rain && !cloudy;
  // Below the status band so the disc clears the clock / Dynamic Island.
  const moonY = Math.min(
    SKY_VIEW_H - 40,
    statusBand + SKY_CELESTIAL_CLEARANCE,
  );
  const moonX = 220;
  const moonR = 7;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={SKY_PLATE_VIEWBOX}
        preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="nightWash" cx="55%" cy="20%" r="80%">
            <Stop offset="0%" stopColor="rgba(40,70,120,0.35)" />
            <Stop offset="55%" stopColor="rgba(18,28,48,0.2)" />
            <Stop offset="100%" stopColor="rgba(8,12,22,0)" />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={SKY_VIEW_W * 0.55}
          cy={28}
          rx={SKY_VIEW_W * 0.7}
          ry={70}
          fill="url(#nightWash)"
        />
      </Svg>

      {showAurora ? (
        <TravelSkyAurora
          statusBand={statusBand}
          motion={motion}
          muted={cloudy || condition.rain}
        />
      ) : null}

      <MotionLayer
        depth={0.3}
        energy={motion.energy}
        tiltX={motion.tiltX}
        tiltY={motion.tiltY}>
        <Svg
          width="100%"
          height="100%"
          viewBox={SKY_PLATE_VIEWBOX}
          preserveAspectRatio="none">
          {dimStars.map((s) => (
            <Circle
              key={s.name}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#F7F3E8"
              opacity={Math.min(1, s.opacity * starOpacityMul)}
            />
          ))}
        </Svg>
      </MotionLayer>

      <MotionLayer
        depth={0.75}
        energy={motion.energy}
        tiltX={motion.tiltX}
        tiltY={motion.tiltY}>
        <Svg
          width="100%"
          height="100%"
          viewBox={SKY_PLATE_VIEWBOX}
          preserveAspectRatio="none">
          {stars.map((s, i) => (
            <TwinklingStar
              key={s.name}
              cx={s.x}
              cy={s.y}
              r={s.r}
              seed={i + 1}
              baseOpacity={Math.min(1, s.opacity * starOpacityMul)}
              color={s.mag < 1 ? '#FFF8E8' : '#F7F3E8'}
            />
          ))}
        </Svg>
      </MotionLayer>

      {cloudy ? (
        <MotionLayer
          depth={1.1}
          delayMs={80}
          driftAmp={condition.cloudCover === 'partly' ? 14 : 18}
          driftMs={condition.cloudCover === 'partly' ? 28000 : 34000}
          energy={motion.energy}
          tiltX={motion.tiltX}
          tiltY={motion.tiltY}>
          <Svg
            width="100%"
            height="100%"
            viewBox={SKY_PLATE_VIEWBOX}
            preserveAspectRatio="none">
            <G
              opacity={
                condition.rain
                  ? 0.55
                  : condition.cloudCover === 'partly'
                    ? 0.32
                    : 0.4
              }>
              <Ellipse cx={80} cy={36} rx={70} ry={18} fill="rgba(40,55,80,0.55)" />
              <Ellipse cx={200} cy={28} rx={90} ry={22} fill="rgba(35,50,75,0.5)" />
              <Ellipse cx={300} cy={42} rx={65} ry={16} fill="rgba(45,60,85,0.45)" />
            </G>
          </Svg>
        </MotionLayer>
      ) : null}

      <PhaseMoon
        cx={moonX}
        cy={moonY}
        r={moonR}
        cycle={cycle}
        southern={lat < 0}
        motion={motion}
        gradientId="itineraryPhaseMoon"
      />

      {clearSky ? (
        <>
          <ShootingStar
            startX={40}
            startY={Math.max(statusBand + 6, 18)}
            dx={130}
            dy={44}
            delayMs={desert ? 3000 : 7000}
            pauseMs={desert ? 14000 : 26000}
            bright={desert ? 0.95 : 0.75}
          />
          {desert ? (
            <ShootingStar
              startX={230}
              startY={Math.max(statusBand + 14, 30)}
              dx={-110}
              dy={38}
              delayMs={11000}
              pauseMs={19000}
              bright={0.85}
            />
          ) : null}
        </>
      ) : null}

      {!condition.rain ? (
        <>
          <Satellite
            pathY={Math.max(statusBand + 8, 28)}
            delayMs={600}
            duration={14000}
            color="rgba(200,220,255,0.85)"
            tiltY={motion.tiltY}
          />
          <Satellite
            pathY={Math.max(statusBand + 24, 52)}
            delayMs={5200}
            duration={18000}
            color="rgba(180,200,230,0.7)"
            tiltY={motion.tiltY}
          />
        </>
      ) : null}

      <TravelSkyWeatherFx
        rain={condition.rain}
        lightning={condition.lightning}
        dark
      />
    </View>
  );
}

const styles = StyleSheet.create({
  streak: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
