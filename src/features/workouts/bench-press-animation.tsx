import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    type LayoutChangeEvent,
} from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { ANATOMY_BEIGE } from './anatomy-art';
import type { AnatomySex, MuscleKey } from './muscle-data';

export interface ExerciseMotionStep {
  id: string;
  title: string;
  cue: string;
  image: number;
}

const BENCH_CUES = [
  {
    id: 'setup',
    title: 'Set up',
    cue: 'Plant both feet. Pull shoulder blades into the bench. Take a secure grip.',
  },
  {
    id: 'unrack',
    title: 'Unrack',
    cue: 'Lock the bar out over mid-chest. Wrists stacked over elbows before you start the rep.',
  },
  {
    id: 'lower',
    title: 'Lower',
    cue: 'Control the descent. Elbows track under the bar as pecs load under stretch.',
  },
  {
    id: 'bottom',
    title: 'Chest touch',
    cue: 'Touch mid-chest without bouncing. Stay braced through the torso and legs.',
  },
  {
    id: 'press',
    title: 'Press',
    cue: 'Drive the bar up and slightly back to lockout. Finish with pecs and triceps stacked.',
  },
] as const;

const MALE_BENCH_IMAGES = [
  require('../../../assets/images/workouts/steps/bench-press/01-setup.jpg'),
  require('../../../assets/images/workouts/steps/bench-press/02-unrack.jpg'),
  require('../../../assets/images/workouts/steps/bench-press/03-lower.jpg'),
  require('../../../assets/images/workouts/steps/bench-press/04-bottom.jpg'),
  require('../../../assets/images/workouts/steps/bench-press/05-press.jpg'),
] as const;

const FEMALE_BENCH_IMAGES = [
  require('../../../assets/images/workouts/steps/bench-press-female/01-setup.jpg'),
  require('../../../assets/images/workouts/steps/bench-press-female/02-unrack.jpg'),
  require('../../../assets/images/workouts/steps/bench-press-female/03-lower.jpg'),
  require('../../../assets/images/workouts/steps/bench-press-female/04-bottom.jpg'),
  require('../../../assets/images/workouts/steps/bench-press-female/05-press.jpg'),
] as const;

export function benchPressStepsForSex(sex: AnatomySex = 'male'): ExerciseMotionStep[] {
  const images = sex === 'female' ? FEMALE_BENCH_IMAGES : MALE_BENCH_IMAGES;
  return BENCH_CUES.map((cue, index) => ({
    ...cue,
    image: images[index],
  }));
}

/** @deprecated Prefer benchPressStepsForSex — kept for existing imports. */
export const BENCH_PRESS_STEPS: ExerciseMotionStep[] = benchPressStepsForSex('male');

const STAGE_HEIGHT = 300;

interface BenchPressAnimationProps {
  anatomySex?: AnatomySex;
  hits: MuscleKey[];
  playing?: boolean;
  onStepChange?: (stepIndex: number, step: ExerciseMotionStep) => void;
}

export function BenchPressAnimation({
  anatomySex = 'male',
  onStepChange,
}: BenchPressAnimationProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const steps = useMemo(() => benchPressStepsForSex(anatomySex), [anatomySex]);
  const step = steps[index] ?? steps[0];

  useEffect(() => {
    setIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [anatomySex]);

  const onStageLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== slideWidth) {
      setSlideWidth(nextWidth);
    }
  };

  const goTo = useCallback(
    (next: number) => {
      if (!slideWidth) return;
      const clamped = Math.max(0, Math.min(steps.length - 1, next));
      scrollRef.current?.scrollTo({ x: clamped * slideWidth, animated: true });
      setIndex(clamped);
      onStepChange?.(clamped, steps[clamped]);
    },
    [onStepChange, slideWidth, steps],
  );

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!slideWidth) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    const clamped = Math.max(0, Math.min(steps.length - 1, next));
    if (clamped === index) return;
    setIndex(clamped);
    onStepChange?.(clamped, steps[clamped]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.stage} onLayout={onStageLayout}>
        {slideWidth > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={{ width: slideWidth }}
            accessibilityRole="adjustable"
            accessibilityLabel={`Bench press step ${index + 1} of ${steps.length}: ${step.title}`}
            accessibilityValue={{
              min: 1,
              max: steps.length,
              now: index + 1,
              text: step.title,
            }}>
            {steps.map((item) => (
              <View key={item.id} style={[styles.slide, { width: slideWidth }]}>
                <Image
                  accessibilityIgnoresInvertColors
                  accessible={false}
                  contentFit="contain"
                  priority="high"
                  source={item.image}
                  style={styles.figure}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          disabled={index === 0}
          hitSlop={10}
          onPress={() => goTo(index - 1)}
          style={[
            styles.navButton,
            styles.navLeft,
            {
              backgroundColor: theme.backgroundElevated,
              opacity: index === 0 ? 0.35 : 1,
            },
          ]}>
          <Symbol name="chevron-left" size="sm" color={theme.textPrimary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next step"
          disabled={index === steps.length - 1}
          hitSlop={10}
          onPress={() => goTo(index + 1)}
          style={[
            styles.navButton,
            styles.navRight,
            {
              backgroundColor: theme.backgroundElevated,
              opacity: index === steps.length - 1 ? 0.35 : 1,
            },
          ]}>
          <Symbol name="chevron-right" size="sm" color={theme.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.stepMeta}>
        <View style={styles.stepHeader}>
          <AppText variant="overline" color="accent">
            Step {index + 1} of {steps.length}
          </AppText>
          <AppText variant="heading">{step.title}</AppText>
        </View>
        <AppText variant="callout" color="secondary">
          {step.cue}
        </AppText>

        <View style={styles.dots}>
          {steps.map((item, dotIndex) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Go to step ${dotIndex + 1}: ${item.title}`}
              hitSlop={8}
              onPress={() => goTo(dotIndex)}
              style={[
                styles.dot,
                {
                  backgroundColor: dotIndex === index ? '#C75B46' : theme.separator,
                  width: dotIndex === index ? 18 : 7,
                },
              ]}
            />
          ))}
        </View>

        <AppText variant="caption" color="tertiary" style={styles.swipeHint}>
          Swipe to move through each phase
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  stage: {
    width: '100%',
    height: STAGE_HEIGHT,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: ANATOMY_BEIGE,
  },
  slide: {
    height: STAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  figure: {
    width: '100%',
    height: '92%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  navLeft: { left: 8 },
  navRight: { right: 8 },
  stepMeta: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  stepHeader: {
    gap: 2,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.xs,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  swipeHint: {
    textAlign: 'center',
  },
});
