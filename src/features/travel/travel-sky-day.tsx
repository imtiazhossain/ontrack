import { useEffect, type ReactNode } from 'react';
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

import type { HeaderSkyCondition } from '@/features/travel/travel-sky-condition';
import {
  SKY_CELESTIAL_CLEARANCE,
  SKY_PLATE_VIEWBOX,
  SKY_VIEW_H,
  SKY_VIEW_W,
} from '@/features/travel/travel-sky-plate';
import { TravelSkyWeatherFx } from '@/features/travel/travel-sky-weather-fx';
import type { TiltSkyMotion } from '@/features/travel/use-tilt-sky-motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

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
  const idle = useSharedValue(0.72);
  useEffect(() => {
    idle.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.65, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, idle]);

  const style = useAnimatedStyle(() => {
    const shine = interpolate(energy.value, [0, 1], [idle.value, 1]);
    return {
      opacity: shine,
      transform: [
        { translateX: tiltX.value * 14 * depth },
        { translateY: tiltY.value * 9 * depth },
      ],
    };
  });

  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

function SoftCloud({
  cx,
  cy,
  scale,
  fill,
  opacity,
}: {
  cx: number;
  cy: number;
  scale: number;
  fill: string;
  opacity: number;
}) {
  return (
    <G opacity={opacity}>
      <Ellipse cx={cx} cy={cy} rx={18 * scale} ry={8 * scale} fill={fill} />
      <Ellipse
        cx={cx - 12 * scale}
        cy={cy + 1 * scale}
        rx={11 * scale}
        ry={7 * scale}
        fill={fill}
      />
      <Ellipse
        cx={cx + 13 * scale}
        cy={cy + 2 * scale}
        rx={12 * scale}
        ry={7.5 * scale}
        fill={fill}
      />
      <Ellipse
        cx={cx + 2 * scale}
        cy={cy - 5 * scale}
        rx={10 * scale}
        ry={7 * scale}
        fill={fill}
      />
    </G>
  );
}

/**
 * Animated bird — wing-flap loop (quadratic morph raised ↔ lowered) with a
 * slow drift across the plate. `frigate` gets longer, thinner wings for
 * tropical destinations.
 */
function FlyingBird({
  y,
  delayMs,
  duration,
  scale,
  color,
  frigate,
  tiltX,
  tiltY,
}: {
  y: number;
  delayMs: number;
  duration: number;
  scale: number;
  color: string;
  frigate: boolean;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
}) {
  const drift = useSharedValue(0);
  const flap = useSharedValue(0);
  useEffect(() => {
    drift.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
    flap.value = withDelay(
      delayMs % 400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 260, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 320, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, drift, duration, flap]);

  const span = (frigate ? 11.5 : 9) * scale;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 0.05, 0.92, 1], [0, 0.9, 0.9, 0]),
    transform: [
      {
        translateX:
          interpolate(drift.value, [0, 1], [-30, SKY_VIEW_W + 30]) +
          tiltX.value * 10,
      },
      {
        translateY:
          y + Math.sin(drift.value * Math.PI * 6) * 2.5 + tiltY.value * 6,
      },
    ],
  }));

  const animatedProps = useAnimatedProps(() => {
    const dip = frigate ? 0.42 : 0.7;
    const tipY = interpolate(flap.value, [0, 1], [-dip, 0.32]) * span;
    const midY = interpolate(flap.value, [0, 1], [-dip * 0.5, 0.1]) * span;
    return {
      d: `M${-span} ${tipY} Q${-span * 0.45} ${midY} 0 0 Q${span * 0.45} ${midY} ${span} ${tipY}`,
    };
  });

  return (
    <Animated.View style={[styles.bird, style]}>
      <Svg
        width={span * 2 + 6}
        height={span + 8}
        viewBox={`${-span - 3} ${-span * 0.8} ${span * 2 + 6} ${span + 8}`}>
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={color}
          strokeWidth={frigate ? 1 : 1.2}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

const RAY_BOX = 92;
const RAY_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

/** Slow-spinning soft rays behind the sun disc. */
function SunRays({
  cx,
  cy,
  warm,
  energy,
}: {
  cx: number;
  cy: number;
  warm: boolean;
  energy: SharedValue<number>;
}) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 52000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(energy.value, [0, 1], [0.75, 1]),
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const stroke = warm ? 'rgba(255,165,85,0.3)' : 'rgba(255,218,125,0.32)';
  const c = RAY_BOX / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.rays,
        {
          left: `${(cx / SKY_VIEW_W) * 100}%`,
          top: `${(cy / SKY_VIEW_H) * 100}%`,
        },
        style,
      ]}>
      <Svg width={RAY_BOX} height={RAY_BOX} viewBox={`0 0 ${RAY_BOX} ${RAY_BOX}`}>
        {RAY_ANGLES.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const inner = 17;
          const outer = i % 2 === 0 ? 42 : 33;
          return (
            <Line
              key={deg}
              x1={c + Math.cos(rad) * inner}
              y1={c + Math.sin(rad) * inner}
              x2={c + Math.cos(rad) * outer}
              y2={c + Math.sin(rad) * outer}
              stroke={stroke}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

function DaySun({
  cx,
  cy,
  motion,
  warm,
}: {
  cx: number;
  cy: number;
  motion: TiltSkyMotion;
  warm: boolean;
}) {
  const idle = useSharedValue(0.8);
  useEffect(() => {
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.75, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [idle]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(motion.energy.value, [0, 1], [idle.value, 1]),
    transform: [
      { translateX: motion.tiltX.value * 6 },
      { translateY: motion.tiltY.value * 4 },
    ],
  }));

  const core = warm ? '#FFB85C' : '#FFE08A';
  const halo = warm ? 'rgba(255,140,70,0.35)' : 'rgba(255,220,120,0.4)';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <SunRays cx={cx} cy={cy} warm={warm} energy={motion.energy} />
      <Svg
        width="100%"
        height="100%"
        viewBox={SKY_PLATE_VIEWBOX}
        preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={halo} />
            <Stop offset="55%" stopColor={halo} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={halo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={22} fill="url(#sunHalo)" />
        <Circle cx={cx} cy={cy} r={10} fill={core} />
        <Circle cx={cx - 2.5} cy={cy - 2.5} r={3.5} fill="rgba(255,255,255,0.35)" />
      </Svg>
    </Animated.View>
  );
}

/** Rising heat distortion cue near the plate base for desert skies. */
function HeatShimmer() {
  const wave = useSharedValue(0);
  useEffect(() => {
    wave.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2300, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [wave]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(wave.value, [0, 1], [0.08, 0.22]),
    transform: [{ translateY: interpolate(wave.value, [0, 1], [1.5, -1.5]) }],
  }));

  const y = SKY_VIEW_H - 22;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={SKY_PLATE_VIEWBOX}
        preserveAspectRatio="none">
        <Path
          d={`M0 ${y} Q 45 ${y - 6}, 90 ${y} T 180 ${y} T 270 ${y} T 360 ${y}`}
          stroke="rgba(255,236,200,0.85)"
          strokeWidth={5}
          fill="none"
        />
        <Path
          d={`M0 ${y + 10} Q 60 ${y + 4}, 120 ${y + 10} T 240 ${y + 10} T 360 ${y + 10}`}
          stroke="rgba(255,244,220,0.7)"
          strokeWidth={4}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

/** Low drifting fog bank for famously foggy destinations on overcast looks. */
function FogWisps({ dark }: { dark?: boolean }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 11000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [drift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(drift.value, [0, 1], [-14, 14]) }],
  }));

  const fill = dark ? 'rgba(120,135,155,0.3)' : 'rgba(226,232,238,0.6)';
  const yBase = SKY_VIEW_H - 26;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={SKY_PLATE_VIEWBOX}
        preserveAspectRatio="none">
        <Ellipse cx={70} cy={yBase} rx={110} ry={13} fill={fill} />
        <Ellipse cx={220} cy={yBase + 10} rx={140} ry={15} fill={fill} opacity={0.85} />
        <Ellipse cx={330} cy={yBase - 4} rx={95} ry={11} fill={fill} opacity={0.7} />
      </Svg>
    </Animated.View>
  );
}

function paletteFor(look: HeaderSkyCondition['look']): {
  wash: string;
  cloud: string;
  cloudOpacity: number;
  showSun: boolean;
  warmSun: boolean;
  showBirds: boolean;
  denseClouds: boolean;
} {
  switch (look) {
    case 'sunrise':
      return {
        wash: 'rgba(255,180,120,0.28)',
        cloud: 'rgba(255,220,200,0.75)',
        cloudOpacity: 0.55,
        showSun: true,
        warmSun: true,
        showBirds: true,
        denseClouds: false,
      };
    case 'sunset':
      return {
        wash: 'rgba(255,120,80,0.3)',
        cloud: 'rgba(255,190,160,0.7)',
        cloudOpacity: 0.6,
        showSun: true,
        warmSun: true,
        showBirds: true,
        denseClouds: false,
      };
    case 'cloudy':
      return {
        wash: 'rgba(160,180,200,0.22)',
        cloud: 'rgba(230,236,242,0.9)',
        cloudOpacity: 0.85,
        showSun: false,
        warmSun: false,
        showBirds: false,
        denseClouds: true,
      };
    case 'rain':
      return {
        wash: 'rgba(120,150,180,0.28)',
        cloud: 'rgba(170,190,210,0.88)',
        cloudOpacity: 0.9,
        showSun: false,
        warmSun: false,
        showBirds: false,
        denseClouds: true,
      };
    case 'storm':
      return {
        wash: 'rgba(90,110,140,0.35)',
        cloud: 'rgba(120,140,165,0.92)',
        cloudOpacity: 0.95,
        showSun: false,
        warmSun: false,
        showBirds: false,
        denseClouds: true,
      };
    default:
      return {
        wash: 'rgba(255,220,140,0.18)',
        cloud: 'rgba(255,255,255,0.72)',
        cloudOpacity: 0.55,
        showSun: true,
        warmSun: false,
        showBirds: true,
        denseClouds: false,
      };
  }
}

export function TravelSkyDay({
  condition,
  statusBand,
  motion,
}: {
  condition: HeaderSkyCondition;
  statusBand: number;
  motion: TiltSkyMotion;
}) {
  const palette = paletteFor(condition.look);
  const accents = condition.accents;
  const sunY = Math.min(SKY_VIEW_H - 30, statusBand + SKY_CELESTIAL_CLEARANCE);
  const sunX = condition.look === 'sunrise' ? 72 : condition.look === 'sunset' ? 300 : 220;
  // Desert clear skies stay cloudless; weather clouds always win.
  const showClouds = palette.denseClouds || !accents.desert;
  const overcastLook = condition.look === 'cloudy' || condition.look === 'rain';
  const birdColor = accents.tropical
    ? 'rgba(35,45,60,0.8)'
    : 'rgba(30,45,62,0.75)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={SKY_PLATE_VIEWBOX}
        preserveAspectRatio="none">
        <Ellipse
          cx={SKY_VIEW_W / 2}
          cy={20}
          rx={SKY_VIEW_W * 0.85}
          ry={80}
          fill={palette.wash}
        />
        {accents.tropical ? (
          <Ellipse
            cx={SKY_VIEW_W * 0.6}
            cy={30}
            rx={SKY_VIEW_W * 0.7}
            ry={64}
            fill="rgba(255,178,102,0.14)"
          />
        ) : null}
      </Svg>

      {palette.showSun ? (
        <DaySun cx={sunX} cy={sunY} motion={motion} warm={palette.warmSun} />
      ) : null}

      {showClouds ? (
        <>
          {/* Far cloud shelf — small, hazy, barely moves with tilt */}
          <MotionLayer
            depth={0.28}
            delayMs={60}
            energy={motion.energy}
            tiltX={motion.tiltX}
            tiltY={motion.tiltY}>
            <Svg
              width="100%"
              height="100%"
              viewBox={SKY_PLATE_VIEWBOX}
              preserveAspectRatio="none">
              <SoftCloud
                cx={120}
                cy={24}
                scale={palette.denseClouds ? 1.05 : 0.8}
                fill={palette.cloud}
                opacity={palette.cloudOpacity * 0.55}
              />
              <SoftCloud
                cx={250}
                cy={34}
                scale={palette.denseClouds ? 0.95 : 0.7}
                fill={palette.cloud}
                opacity={palette.cloudOpacity * 0.5}
              />
            </Svg>
          </MotionLayer>

          {/* Near cloud layer — larger, rides tilt visibly */}
          <MotionLayer
            depth={0.9}
            delayMs={120}
            energy={motion.energy}
            tiltX={motion.tiltX}
            tiltY={motion.tiltY}>
            <Svg
              width="100%"
              height="100%"
              viewBox={SKY_PLATE_VIEWBOX}
              preserveAspectRatio="none">
              <SoftCloud
                cx={70}
                cy={42}
                scale={palette.denseClouds ? 1.35 : 1}
                fill={palette.cloud}
                opacity={palette.cloudOpacity}
              />
              <SoftCloud
                cx={170}
                cy={28}
                scale={palette.denseClouds ? 1.5 : 1.15}
                fill={palette.cloud}
                opacity={palette.cloudOpacity * 0.9}
              />
              <SoftCloud
                cx={280}
                cy={48}
                scale={palette.denseClouds ? 1.4 : 0.95}
                fill={palette.cloud}
                opacity={palette.cloudOpacity * 0.85}
              />
              {palette.denseClouds ? (
                <>
                  <SoftCloud
                    cx={120}
                    cy={58}
                    scale={1.2}
                    fill={palette.cloud}
                    opacity={palette.cloudOpacity * 0.8}
                  />
                  <SoftCloud
                    cx={230}
                    cy={36}
                    scale={1.25}
                    fill={palette.cloud}
                    opacity={palette.cloudOpacity * 0.75}
                  />
                </>
              ) : null}
            </Svg>
          </MotionLayer>
        </>
      ) : null}

      {palette.showBirds ? (
        <>
          <FlyingBird
            y={statusBand + 34}
            delayMs={0}
            duration={30000}
            scale={1}
            color={birdColor}
            frigate={accents.tropical}
            tiltX={motion.tiltX}
            tiltY={motion.tiltY}
          />
          <FlyingBird
            y={statusBand + 24}
            delayMs={6000}
            duration={38000}
            scale={0.8}
            color={birdColor}
            frigate={accents.tropical}
            tiltX={motion.tiltX}
            tiltY={motion.tiltY}
          />
          <FlyingBird
            y={statusBand + 48}
            delayMs={13000}
            duration={26000}
            scale={0.62}
            color={birdColor}
            frigate={accents.tropical}
            tiltX={motion.tiltX}
            tiltY={motion.tiltY}
          />
        </>
      ) : null}

      {accents.desert && !palette.denseClouds ? <HeatShimmer /> : null}
      {accents.fog && overcastLook ? <FogWisps /> : null}

      <TravelSkyWeatherFx
        rain={condition.rain}
        lightning={condition.lightning}
        dark={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bird: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  rays: {
    position: 'absolute',
    width: RAY_BOX,
    height: RAY_BOX,
    marginLeft: -RAY_BOX / 2,
    marginTop: -RAY_BOX / 2,
  },
});
