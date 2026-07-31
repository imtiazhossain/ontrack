import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Symbol } from '@/components/primitives';
import { categoryColors, layout, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import {
  MOVEMENT_LABELS,
  movementPatternForExercise,
  muscleHitsForExercise,
  type MovementPattern,
} from './exercise-motion';
import {
  MUSCLE_GROUPS_BY_KEY,
  type ExerciseTemplate,
  type MuscleKey,
  type MuscleTarget,
} from './muscle-data';
import { BenchPressAnimation } from './bench-press-animation';
import {
  ACTIVE_MUSCLE,
  GenericAnatomyFigure,
  RESTING_MUSCLE,
} from './generic-anatomy-figure';

interface ExerciseAnatomyDemoProps {
  exercise?: ExerciseTemplate;
  primaryGroup: MuscleKey;
  primaryTarget: MuscleTarget;
  selected: boolean;
  visible: boolean;
  onClose: () => void;
  onToggleSelected: () => void;
}

interface DemoContentProps extends Omit<ExerciseAnatomyDemoProps, 'exercise'> {
  exercise: ExerciseTemplate;
}

function AnimatedAnatomyFigure({
  exerciseId,
  hits,
  pattern,
  playing,
}: {
  exerciseId: string;
  hits: MuscleKey[];
  pattern: MovementPattern;
  playing: boolean;
}) {
  if (exerciseId === 'bench-press') {
    return <BenchPressAnimation hits={hits} playing={playing} />;
  }

  return <GenericAnatomyFigure hits={hits} pattern={pattern} playing={playing} />;
}

function DemoContent({
  exercise,
  primaryGroup,
  primaryTarget,
  selected,
  visible,
  onClose,
  onToggleSelected,
}: DemoContentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const gymColors = categoryColors(theme, 'gym');
  const [playing, setPlaying] = useState(true);
  const pattern = movementPatternForExercise(exercise);
  const hits = muscleHitsForExercise(exercise, primaryGroup);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View
        style={[
          styles.modalRoot,
          { backgroundColor: theme.overlayScrim, paddingTop: insets.top },
        ]}>
        <Pressable
          accessibilityLabel="Close exercise animation"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundPrimary,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.sheetHeader}>
              <View style={styles.flex}>
                <AppText variant="overline" color="accent">Anatomy in motion</AppText>
                <AppText variant="title">{exercise.name}</AppText>
                <AppText variant="callout" color="secondary">
                  {MOVEMENT_LABELS[pattern]} · {exercise.sets} sets × {exercise.reps}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close animation"
                hitSlop={8}
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: theme.backgroundSunken }]}>
                <AppText variant="heading" color="primary" style={styles.closeMark}>×</AppText>
              </Pressable>
            </View>

            <View
              style={[
                styles.animationCard,
                { backgroundColor: theme.backgroundSunken, borderColor: theme.separator },
              ]}>
              <View style={styles.animationMeta}>
                <View style={[styles.loopPill, { backgroundColor: theme.backgroundElevated }]}>
                  <View style={[styles.loopDot, { backgroundColor: gymColors.main }]} />
                  <AppText variant="overline" color="secondary">
                    {playing ? 'Looping motion' : 'Paused'}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={playing ? 'Pause animation' : 'Play animation'}
                  onPress={() => setPlaying((current) => !current)}
                  style={[styles.playButton, { backgroundColor: theme.backgroundElevated }]}>
                  <Symbol name={playing ? 'pause.fill' : 'play.fill'} size="sm" color={gymColors.main} />
                  <AppText variant="caption" color="accent">{playing ? 'Pause' : 'Play'}</AppText>
                </Pressable>
              </View>

              <AnimatedAnatomyFigure
                exerciseId={exercise.id}
                hits={hits}
                pattern={pattern}
                playing={playing}
              />

              <View style={styles.motionLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: ACTIVE_MUSCLE }]} />
                  <AppText variant="caption" color="secondary">Muscles working</AppText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: RESTING_MUSCLE }]} />
                  <AppText variant="caption" color="secondary">Supporting anatomy</AppText>
                </View>
              </View>
            </View>

            <View style={styles.targetSection}>
              <View>
                <AppText variant="overline" color="tertiary">Primary target</AppText>
                <AppText variant="heading">{primaryTarget.label}</AppText>
                <AppText variant="callout" color="secondary">
                  {primaryTarget.description}
                </AppText>
              </View>

              <View style={styles.hitChips}>
                {hits.map((key, index) => (
                  <View
                    key={key}
                    style={[
                      styles.hitChip,
                      {
                        backgroundColor: index === 0 ? gymColors.tint : theme.backgroundSunken,
                        borderColor: index === 0 ? gymColors.main : theme.separator,
                      },
                    ]}>
                    <View
                      style={[
                        styles.hitChipDot,
                        { backgroundColor: index === 0 ? gymColors.main : theme.textTertiary },
                      ]}
                    />
                    <AppText variant="caption" color={index === 0 ? 'accent' : 'secondary'}>
                      {MUSCLE_GROUPS_BY_KEY[key].label}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.demoCue, { backgroundColor: gymColors.tint }]}>
              <Symbol name="scope" size="md" color={gymColors.main} />
              <View style={styles.flex}>
                <AppText variant="overline" color="accent">What to feel</AppText>
                <AppText variant="callout" color="secondary">{primaryTarget.cue}</AppText>
              </View>
            </View>

            <Button
              icon={selected ? 'minus-circle' : 'plus-circle'}
              onPress={onToggleSelected}
              size="lg"
              variant={selected ? 'secondary' : 'primary'}>
              {selected ? 'Remove from session' : 'Add to session'}
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ExerciseAnatomyDemo(props: ExerciseAnatomyDemoProps) {
  if (!props.exercise) return null;
  return <DemoContent {...props} exercise={props.exercise} />;
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
    sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    maxHeight: '94%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    boxShadow: '0 -18px 50px rgba(0,0,0,0.22)',
  },
    sheetContent: {
    gap: spacing.xl,
    padding: layout.screenPadding,
  },
    sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
    closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
    closeMark: {
    marginTop: -2,
  },
    animationCard: {
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
    animationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
    loopPill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
    loopDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
    playButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
    motionLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
    legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
    legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
    targetSection: {
    gap: spacing.md,
  },
    hitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
    hitChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
    hitChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
    demoCue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
