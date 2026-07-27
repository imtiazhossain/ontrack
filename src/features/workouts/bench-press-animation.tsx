import { useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { MuscleKey } from './muscle-data';

const ANATOMY_FRONT = require('../../../assets/images/workouts/anatomy-front-transparent.png');

const SOURCE_WIDTH = 950;
const SOURCE_HEIGHT = 1655;
const BODY_HEIGHT = 272;
const BODY_SCALE = BODY_HEIGHT / SOURCE_HEIGHT;
const BODY_WIDTH = SOURCE_WIDTH * BODY_SCALE;
const SCENE_WIDTH = 320;
const SCENE_HEIGHT = 306;
const BODY_LEFT = (SCENE_WIDTH - BODY_WIDTH) / 2;
const BODY_TOP = 17;

interface SourceRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

const CORE: SourceRect = { x: 220, y: 0, width: 510, height: SOURCE_HEIGHT };
const LEFT_UPPER_ARM: SourceRect = { x: 145, y: 280, width: 200, height: 360 };
const RIGHT_UPPER_ARM: SourceRect = { x: 605, y: 280, width: 200, height: 360 };
const LEFT_FOREARM: SourceRect = { x: 70, y: 565, width: 220, height: 420 };
const RIGHT_FOREARM: SourceRect = { x: 660, y: 565, width: 220, height: 420 };

const LEFT_SHOULDER = { x: 165 * BODY_SCALE, y: 65 * BODY_SCALE };
const RIGHT_SHOULDER = { x: 35 * BODY_SCALE, y: 65 * BODY_SCALE };
const LEFT_ELBOW = { x: 90 * BODY_SCALE, y: 320 * BODY_SCALE };
const RIGHT_ELBOW = { x: 110 * BODY_SCALE, y: 320 * BODY_SCALE };
const LEFT_FOREARM_PIVOT = { x: 165 * BODY_SCALE, y: 35 * BODY_SCALE };
const RIGHT_FOREARM_PIVOT = { x: 55 * BODY_SCALE, y: 35 * BODY_SCALE };

const LEFT_SHOULDER_IN_SCENE = {
  x: BODY_LEFT + 310 * BODY_SCALE,
  y: BODY_TOP + 345 * BODY_SCALE,
};
const RIGHT_SHOULDER_IN_SCENE = {
  x: BODY_LEFT + 640 * BODY_SCALE,
  y: BODY_TOP + 345 * BODY_SCALE,
};

interface AnatomyCropProps {
  rect: SourceRect;
}

function AnatomyCrop({ rect }: AnatomyCropProps) {
  return (
    <View
      style={{
        height: rect.height * BODY_SCALE,
        width: rect.width * BODY_SCALE,
        overflow: 'hidden',
      }}>
      <Image
        accessibilityIgnoresInvertColors
        accessible={false}
        contentFit="fill"
        priority="high"
        source={ANATOMY_FRONT}
        style={{
          position: 'absolute',
          top: -rect.y * BODY_SCALE,
          left: -rect.x * BODY_SCALE,
          width: BODY_WIDTH,
          height: BODY_HEIGHT,
        }}
      />
    </View>
  );
}

function smoothStep(value: number) {
  'worklet';
  return value * value * (3 - 2 * value);
}

export function BenchPressAnimation({
  hits,
  playing,
}: {
  hits: MuscleKey[];
  playing: boolean;
}) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const chestActive = hits.includes('chest');
  const tricepsActive = hits.includes('triceps');

  useEffect(() => {
    cancelAnimation(progress);

    if (reduceMotion) {
      progress.value = 0.58;
      return;
    }
    if (!playing) return;

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1250,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(progress);
  }, [playing, progress, reduceMotion]);

  const barMotion = useAnimatedStyle(() => {
    const p = smoothStep(progress.value);
    return {
      transform: [
        { translateY: 27 * (1 - p) },
        { scale: 1 + 0.035 * p },
      ],
    };
  });

  const barShadowMotion = useAnimatedStyle(() => {
    const p = smoothStep(progress.value);
    return {
      opacity: 0.08 + 0.16 * (1 - p),
      transform: [
        { translateY: 30 },
        { scaleX: 0.84 + 0.16 * (1 - p) },
        { scaleY: 0.72 + 0.28 * (1 - p) },
      ],
    };
  });

  const leftUpperArmMotion = useAnimatedStyle(() => {
    const p = smoothStep(progress.value);
    return {
      transform: [
        { rotate: `${55 + 13 * p}deg` },
        { scaleY: 1 - 0.28 * p },
      ],
    };
  });

  const rightUpperArmMotion = useAnimatedStyle(() => {
    const p = smoothStep(progress.value);
    return {
      transform: [
        { rotate: `${-55 - 13 * p}deg` },
        { scaleY: 1 - 0.28 * p },
      ],
    };
  });

  const leftForearmMotion = useAnimatedStyle(() => {
    const p = smoothStep(progress.value);
    return {
      transform: [
        { rotate: `${197 - 42 * p}deg` },
        { scaleY: 0.92 - 0.52 * p },
      ],
    };
  });

  const rightForearmMotion = useAnimatedStyle(() => {
    const p = smoothStep(progress.value);
    return {
      transform: [
        { rotate: `${-197 + 42 * p}deg` },
        { scaleY: 0.92 - 0.52 * p },
      ],
    };
  });

  const musclePulse = useAnimatedStyle(() => {
    const p = smoothStep(progress.value);
    return {
      opacity: 0.42 + 0.28 * p,
      transform: [{ scale: 0.96 + 0.08 * p }],
    };
  });

  return (
    <View style={styles.stage}>
      <View style={styles.scene}>
        <View style={styles.pressPath}>
          <View style={styles.pressPathDash} />
          <View style={styles.pressPathDash} />
          <View style={styles.pressPathDash} />
        </View>

        <View style={styles.rackLeft} />
        <View style={styles.rackRight} />
        <View style={styles.bench}>
          <View style={styles.benchHeadrest} />
        </View>

        <View
          style={[
            styles.bodyCore,
            {
              left: BODY_LEFT + CORE.x * BODY_SCALE,
              top: BODY_TOP,
            },
          ]}>
          <AnatomyCrop rect={CORE} />
        </View>

        {chestActive ? (
          <>
            <Animated.View style={[styles.chestHighlight, styles.leftChest, musclePulse]} />
            <Animated.View style={[styles.chestHighlight, styles.rightChest, musclePulse]} />
          </>
        ) : null}

        <Animated.View
          style={[
            styles.leftUpperArm,
            {
              left: LEFT_SHOULDER_IN_SCENE.x - LEFT_SHOULDER.x,
              top: LEFT_SHOULDER_IN_SCENE.y - LEFT_SHOULDER.y,
              transformOrigin: `${LEFT_SHOULDER.x}px ${LEFT_SHOULDER.y}px`,
            },
            leftUpperArmMotion,
          ]}>
          <AnatomyCrop rect={LEFT_UPPER_ARM} />
          {tricepsActive ? <Animated.View style={[styles.leftTricepsGlow, musclePulse]} /> : null}
          <Animated.View
            style={[
              styles.leftForearm,
              {
                left: LEFT_ELBOW.x - LEFT_FOREARM_PIVOT.x,
                top: LEFT_ELBOW.y - LEFT_FOREARM_PIVOT.y,
                transformOrigin: `${LEFT_FOREARM_PIVOT.x}px ${LEFT_FOREARM_PIVOT.y}px`,
              },
              leftForearmMotion,
            ]}>
            <AnatomyCrop rect={LEFT_FOREARM} />
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            styles.rightUpperArm,
            {
              left: RIGHT_SHOULDER_IN_SCENE.x - RIGHT_SHOULDER.x,
              top: RIGHT_SHOULDER_IN_SCENE.y - RIGHT_SHOULDER.y,
              transformOrigin: `${RIGHT_SHOULDER.x}px ${RIGHT_SHOULDER.y}px`,
            },
            rightUpperArmMotion,
          ]}>
          <AnatomyCrop rect={RIGHT_UPPER_ARM} />
          {tricepsActive ? <Animated.View style={[styles.rightTricepsGlow, musclePulse]} /> : null}
          <Animated.View
            style={[
              styles.rightForearm,
              {
                left: RIGHT_ELBOW.x - RIGHT_FOREARM_PIVOT.x,
                top: RIGHT_ELBOW.y - RIGHT_FOREARM_PIVOT.y,
                transformOrigin: `${RIGHT_FOREARM_PIVOT.x}px ${RIGHT_FOREARM_PIVOT.y}px`,
              },
              rightForearmMotion,
            ]}>
            <AnatomyCrop rect={RIGHT_FOREARM} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.barShadow, barShadowMotion]} />
        <Animated.View style={[styles.barbell, barMotion]}>
          <View style={styles.leftPlateOuter} />
          <View style={styles.leftPlateInner} />
          <View style={styles.barShaft} />
          <View style={styles.leftGrip} />
          <View style={styles.rightGrip} />
          <View style={styles.rightPlateInner} />
          <View style={styles.rightPlateOuter} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#EEE9DF',
  },
  scene: {
    position: 'relative',
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
  },
  pressPath: {
    position: 'absolute',
    top: 68,
    left: SCENE_WIDTH / 2 - 1,
    zIndex: 1,
    gap: 5,
  },
  pressPathDash: {
    width: 2,
    height: 5,
    borderRadius: 1,
    backgroundColor: 'rgba(166, 82, 43, 0.24)',
  },
  bench: {
    position: 'absolute',
    top: 8,
    left: 126,
    zIndex: 1,
    width: 68,
    height: 290,
    borderWidth: 2,
    borderColor: '#40362F',
    borderRadius: 18,
    backgroundColor: '#5A4A40',
    boxShadow: '0 9px 14px rgba(51, 36, 26, 0.2)',
  },
  benchHeadrest: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    height: 67,
    borderRadius: 12,
    backgroundColor: '#6B584B',
  },
  rackLeft: {
    position: 'absolute',
    top: 57,
    left: 25,
    zIndex: 0,
    width: 9,
    height: 77,
    borderRadius: 5,
    backgroundColor: '#8D827A',
  },
  rackRight: {
    position: 'absolute',
    top: 57,
    right: 25,
    zIndex: 0,
    width: 9,
    height: 77,
    borderRadius: 5,
    backgroundColor: '#8D827A',
  },
  bodyCore: {
    position: 'absolute',
    zIndex: 2,
  },
  leftUpperArm: {
    position: 'absolute',
    zIndex: 3,
    width: LEFT_UPPER_ARM.width * BODY_SCALE,
    height: LEFT_UPPER_ARM.height * BODY_SCALE,
  },
  rightUpperArm: {
    position: 'absolute',
    zIndex: 3,
    width: RIGHT_UPPER_ARM.width * BODY_SCALE,
    height: RIGHT_UPPER_ARM.height * BODY_SCALE,
  },
  leftForearm: {
    position: 'absolute',
    width: LEFT_FOREARM.width * BODY_SCALE,
    height: LEFT_FOREARM.height * BODY_SCALE,
  },
  rightForearm: {
    position: 'absolute',
    width: RIGHT_FOREARM.width * BODY_SCALE,
    height: RIGHT_FOREARM.height * BODY_SCALE,
  },
  chestHighlight: {
    position: 'absolute',
    top: 79,
    zIndex: 4,
    width: 34,
    height: 23,
    borderWidth: 1,
    borderColor: '#FFD3A3',
    borderRadius: 13,
    backgroundColor: '#FF9A5F',
  },
  leftChest: {
    left: 127,
    transform: [{ rotate: '7deg' }],
  },
  rightChest: {
    right: 127,
    transform: [{ rotate: '-7deg' }],
  },
  leftTricepsGlow: {
    position: 'absolute',
    top: 15,
    left: 10,
    width: 13,
    height: 37,
    borderRadius: 8,
    backgroundColor: '#F28B64',
  },
  rightTricepsGlow: {
    position: 'absolute',
    top: 15,
    right: 10,
    width: 13,
    height: 37,
    borderRadius: 8,
    backgroundColor: '#F28B64',
  },
  barShadow: {
    position: 'absolute',
    top: 69,
    left: 46,
    zIndex: 3,
    width: 228,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#2C211C',
  },
  barbell: {
    position: 'absolute',
    top: 66,
    left: 10,
    zIndex: 6,
    width: 300,
    height: 20,
    justifyContent: 'center',
  },
  barShaft: {
    position: 'absolute',
    left: 15,
    right: 15,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2C2623',
  },
  leftPlateOuter: {
    position: 'absolute',
    left: 0,
    width: 10,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#A6522B',
  },
  leftPlateInner: {
    position: 'absolute',
    left: 11,
    width: 7,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#C9693B',
  },
  rightPlateInner: {
    position: 'absolute',
    right: 11,
    width: 7,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#C9693B',
  },
  rightPlateOuter: {
    position: 'absolute',
    right: 0,
    width: 10,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#A6522B',
  },
  leftGrip: {
    position: 'absolute',
    left: 101,
    width: 32,
    height: 6,
    borderWidth: 1,
    borderColor: '#EEE9DF',
    borderRadius: 3,
    backgroundColor: '#39312D',
  },
  rightGrip: {
    position: 'absolute',
    right: 101,
    width: 32,
    height: 6,
    borderWidth: 1,
    borderColor: '#EEE9DF',
    borderRadius: 3,
    backgroundColor: '#39312D',
  },
});
