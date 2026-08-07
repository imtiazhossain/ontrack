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
  ClipPath,
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
  moonTerminatorPath,
  projectStarsToPlate,
} from '@/features/travel/travel-sky-astronomy';
import {
  destinationShowsAurora,
  TravelSkyAurora,
} from '@/features/travel/travel-sky-aurora';
import type { HeaderSkyCondition } from '@/features/travel/travel-sky-condition';
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
  delayMs,
  energy,
  tiltX,
  tiltY,
  children,
}: {
  depth: number;
  delayMs: number;
  energy: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  children: ReactNode;
}) {
  const idle = useSharedValue(0.55);
  useEffect(() => {
    idle.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.42, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, idle]);

  const style = useAnimatedStyle(() => {
    const twinkle = interpolate(energy.value, [0, 1], [idle.value * 0.85, 1]);
    return {
      opacity: twinkle,
      transform: [
        { translateX: tiltX.value * 16 * depth },
        { translateY: tiltY.value * 10 * depth },
      ],
    };
  });

  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

function PulsingStar({
  cx,
  cy,
  r,
  delayMs,
  baseOpacity,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  delayMs: number;
  baseOpacity: number;
  color: string;
}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 1400 + (delayMs % 700),
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: 1600 + (delayMs % 500),
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, pulse]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: baseOpacity * (0.55 + pulse.value * 0.45),
    r: r * (0.92 + pulse.value * 0.18),
  }));

  return <AnimatedCircle cx={cx} cy={cy} fill={color} animatedProps={animatedProps} />;
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

/** Fixed lunar-surface features, positioned as fractions of the moon radius. */
const MOON_MARIA = [
  { fx: -0.34, fy: -0.3, frx: 0.34, fry: 0.26 },
  { fx: 0.06, fy: -0.4, frx: 0.24, fry: 0.18 },
  { fx: 0.34, fy: -0.08, frx: 0.2, fry: 0.26 },
  { fx: -0.12, fy: 0.12, frx: 0.4, fry: 0.28 },
] as const;

const MOON_CRATERS = [
  { fx: 0.46, fy: 0.3, fr: 0.13 },
  { fx: 0.18, fy: 0.52, fr: 0.09 },
  { fx: -0.52, fy: 0.34, fr: 0.11 },
  { fx: 0.55, fy: -0.38, fr: 0.08 },
  { fx: -0.26, fy: -0.58, fr: 0.07 },
] as const;

/** Tycho — larger crater near the southern limb with a faint ray splash. */
const MOON_TYCHO = { fx: -0.06, fy: 0.62, fr: 0.12 } as const;

/**
 * Phase-accurate realistic moon: lit region from terminator-arc geometry,
 * surface shading + maria + craters clipped to the lit side, faint
 * earthshine disc behind, soft glow halo.
 */
function PhaseMoon({
  cx,
  cy,
  r,
  cycle,
  southern,
  motion,
}: {
  cx: number;
  cy: number;
  r: number;
  cycle: number;
  southern: boolean;
  motion: TiltSkyMotion;
}) {
  const litPath = moonTerminatorPath(cycle, cx, cy, r, southern);
  if (!litPath) return null;

  const idle = useSharedValue(0.88);
  useEffect(() => {
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.84, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [idle]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(motion.energy.value, [0, 1], [idle.value, 1]),
    transform: [
      { translateX: motion.tiltX.value * 3 },
      { translateY: motion.tiltY.value * 2 },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={SKY_PLATE_VIEWBOX}
        preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(232,238,248,0.22)" />
            <Stop offset="100%" stopColor="rgba(232,238,248,0)" />
          </RadialGradient>
          <RadialGradient
            id="moonSurface"
            gradientUnits="userSpaceOnUse"
            cx={cx - r * 0.28}
            cy={cy - r * 0.32}
            r={r * 1.6}>
            <Stop offset="0%" stopColor="#F8FAFC" />
            <Stop offset="55%" stopColor="#DCE3EC" />
            <Stop offset="100%" stopColor="#A9B5C4" />
          </RadialGradient>
          <ClipPath id="moonLit">
            <Path d={litPath} />
          </ClipPath>
        </Defs>

        {/* Halo + faint earthshine on the dark side */}
        <Circle cx={cx} cy={cy} r={r * 1.6} fill="url(#moonGlow)" />
        <Circle cx={cx} cy={cy} r={r} fill="rgba(214,224,238,0.12)" />

        <G clipPath="url(#moonLit)">
          <Circle cx={cx} cy={cy} r={r} fill="url(#moonSurface)" />
          {/* Maria — darker basalt plains */}
          {MOON_MARIA.map((m, i) => (
            <Ellipse
              key={`maria-${i}`}
              cx={cx + m.fx * r}
              cy={cy + m.fy * r}
              rx={m.frx * r}
              ry={m.fry * r}
              fill="rgba(96,112,134,0.34)"
            />
          ))}
          {/* Craters — dark floor inside a light rim */}
          {MOON_CRATERS.map((c, i) => (
            <G key={`crater-${i}`}>
              <Circle
                cx={cx + c.fx * r}
                cy={cy + c.fy * r}
                r={c.fr * r}
                fill="none"
                stroke="rgba(240,246,252,0.5)"
                strokeWidth={c.fr * r * 0.35}
              />
              <Circle
                cx={cx + c.fx * r + c.fr * r * 0.12}
                cy={cy + c.fy * r + c.fr * r * 0.12}
                r={c.fr * r * 0.72}
                fill="rgba(84,99,120,0.42)"
              />
            </G>
          ))}
          {/* Tycho + ray splash */}
          <Circle
            cx={cx + MOON_TYCHO.fx * r}
            cy={cy + MOON_TYCHO.fy * r}
            r={MOON_TYCHO.fr * r}
            fill="rgba(238,244,250,0.6)"
          />
          {[-40, 0, 42].map((deg) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            const x0 = cx + MOON_TYCHO.fx * r;
            const y0 = cy + MOON_TYCHO.fy * r;
            return (
              <Line
                key={`ray-${deg}`}
                x1={x0}
                y1={y0}
                x2={x0 + Math.cos(rad) * r * 0.55}
                y2={y0 - Math.sin(rad) * r * 0.55}
                stroke="rgba(235,242,250,0.3)"
                strokeWidth={r * 0.07}
                strokeLinecap="round"
              />
            );
          })}
          {/* Limb darkening — spherical falloff at the edge */}
          <Circle
            cx={cx}
            cy={cy}
            r={r * 0.93}
            fill="none"
            stroke="rgba(52,66,88,0.28)"
            strokeWidth={r * 0.16}
          />
        </G>
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
  // Open sky between title and + — keep below the status band so chrome joins cleanly.
  const moonY = Math.min(
    SKY_VIEW_H - 40,
    statusBand + SKY_CELESTIAL_CLEARANCE,
  );
  const moonX = 220;
  /** Compact accent — larger than a star, still smaller than header icon buttons. */
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
        delayMs={0}
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
        delayMs={180}
        energy={motion.energy}
        tiltX={motion.tiltX}
        tiltY={motion.tiltY}>
        <Svg
          width="100%"
          height="100%"
          viewBox={SKY_PLATE_VIEWBOX}
          preserveAspectRatio="none">
          {stars.map((s, i) => (
            <PulsingStar
              key={s.name}
              cx={s.x}
              cy={s.y}
              r={s.r}
              delayMs={(i * 137) % 2400}
              baseOpacity={Math.min(1, s.opacity * starOpacityMul)}
              color={s.mag < 1 ? '#FFF8E8' : '#F7F3E8'}
            />
          ))}
        </Svg>
      </MotionLayer>

      {cloudy ? (
        <MotionLayer
          depth={1.1}
          delayMs={340}
          energy={motion.energy}
          tiltX={motion.tiltX}
          tiltY={motion.tiltY}>
          <Svg
            width="100%"
            height="100%"
            viewBox={SKY_PLATE_VIEWBOX}
            preserveAspectRatio="none">
            <G opacity={condition.rain ? 0.55 : 0.4}>
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
