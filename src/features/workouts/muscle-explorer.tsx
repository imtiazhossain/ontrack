import { lazy, Suspense } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, LoadingBlock } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { ANATOMY_BEIGE } from '@/features/workouts/anatomy-art';
import { formatMuscleLabel } from '@/features/workouts/format-muscle-label';
import { MuscleAtlasDropdowns } from '@/features/workouts/muscle-atlas-dropdowns';
import type { MuscleAtlasCategoryId, MuscleAtlasEntry } from '@/features/workouts/muscle-atlas';
import type {
  AnatomySex,
  BodyView,
  MuscleGroup,
  MuscleKey,
  MuscleTarget,
} from '@/features/workouts/muscle-data';
import {
  BODY_VIEW_TABS,
  HIGHLIGHT_COLOR,
  bodyViewLabel,
} from '@/features/workouts/muscle-explorer-selection';
import type { resolveAtlasWorkoutSelection } from '@/features/workouts/atlas-workout-selection';
import { useTheme } from '@/hooks/use-theme';

const HumanBodyMap = lazy(() =>
  import('@/features/workouts/human-body-map').then((mod) => ({ default: mod.HumanBodyMap })),
);

type AtlasSelection = ReturnType<typeof resolveAtlasWorkoutSelection>;

export function MuscleExplorer({
  anatomySex,
  bodyView,
  selectedMuscle,
  selectedTarget,
  atlasCategoryId,
  atlasMuscle,
  atlasSelection,
  visibleMuscles,
  gymColors,
  onChangeAnatomySex,
  onChangeBodyView,
  onSelectMapHit,
  onSelectMuscle,
  onSelectAtlasCategory,
  onSelectAtlasMuscle,
}: {
  anatomySex: AnatomySex;
  bodyView: BodyView;
  selectedMuscle: MuscleKey;
  selectedTarget: MuscleTarget;
  atlasCategoryId: MuscleAtlasCategoryId;
  atlasMuscle: MuscleAtlasEntry;
  atlasSelection: AtlasSelection;
  visibleMuscles: MuscleGroup[];
  gymColors: { main: string; tint: string };
  onChangeAnatomySex: (next: AnatomySex) => void;
  onChangeBodyView: (next: BodyView) => void;
  onSelectMapHit: (hit: { key: MuscleKey; highlightId: string }) => void;
  onSelectMuscle: (key: MuscleKey) => void;
  onSelectAtlasCategory: (categoryId: MuscleAtlasCategoryId) => void;
  onSelectAtlasMuscle: (muscle: MuscleAtlasEntry) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <View style={styles.sectionIntro}>
        <AppText variant="overline" color="tertiary">Interactive Anatomy</AppText>
        <AppText variant="heading">Muscle Explorer</AppText>
      </View>

      <View
        style={[
          styles.bodyExperience,
          { backgroundColor: ANATOMY_BEIGE, borderColor: theme.separator },
        ]}>
        <View style={[styles.bodyChromeBar, { backgroundColor: ANATOMY_BEIGE }]}>
          <View style={styles.bodyChromeTopRow}>
            <View
              style={[
                styles.sexToggle,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.separator,
                },
              ]}>
              {([
                { id: 'male' as const, label: 'Male' },
                { id: 'female' as const, label: 'Female' },
              ]).map((option) => {
                const selected = anatomySex === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label} anatomy`}
                    accessibilityState={{ selected }}
                    hitSlop={4}
                    onPress={() => onChangeAnatomySex(option.id)}
                    style={[
                      styles.sexToggleTab,
                      selected && { backgroundColor: theme.backgroundSunken },
                    ]}>
                    <AppText
                      variant="caption"
                      color={selected ? 'primary' : 'secondary'}
                      fit>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={[
                styles.bodyViewDock,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.separator,
                },
              ]}>
              {BODY_VIEW_TABS.map((tab) => {
                const selected = bodyView === tab.view;
                return (
                  <Pressable
                    key={tab.view}
                    accessibilityRole="tab"
                    accessibilityLabel={`${tab.label} body view`}
                    accessibilityState={{ selected }}
                    onPress={() => onChangeBodyView(tab.view)}
                    style={[
                      styles.bodyTab,
                      selected && { backgroundColor: theme.backgroundSunken },
                    ]}>
                    <AppText
                      variant="caption"
                      color={selected ? 'primary' : 'secondary'}
                      fit>
                      {tab.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.atlasControlsInline}>
            <MuscleAtlasDropdowns
              categoryId={atlasCategoryId}
              muscle={atlasMuscle}
              onSelectCategory={onSelectAtlasCategory}
              onSelectMuscle={onSelectAtlasMuscle}
            />
          </View>
        </View>

        <View style={styles.bodyMapStage}>
          <Suspense fallback={<LoadingBlock label="Loading anatomy…" />}>
            <HumanBodyMap
              anatomySex={anatomySex}
              bodyView={bodyView}
              selectedMuscle={selectedMuscle}
              selectedTarget={selectedTarget}
              highlightMuscleId={atlasSelection.highlightMuscleId}
              onSelectHit={onSelectMapHit}
            />
          </Suspense>
        </View>

        <View
          style={[
            styles.bodyCaption,
            {
              backgroundColor: theme.backgroundElevated,
              borderTopColor: theme.separator,
            },
          ]}>
          <View style={styles.bodyCaptionCopy}>
            <View style={styles.focusIndicator} />
            <View style={styles.flex}>
              <AppText variant="overline" color="tertiary">
                {atlasSelection.groupLabel}
              </AppText>
              <AppText variant="subheading" numberOfLines={2}>
                {formatMuscleLabel(atlasMuscle.name)}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color="tertiary">
            {bodyViewLabel(bodyView)} · {anatomySex === 'female' ? 'Female' : 'Male'}
            {atlasMuscle.visibility === 'deep' ? ' · Deep' : ''}
          </AppText>
        </View>
      </View>

      <ScrollView
        horizontal
        accessibilityRole="tablist"
        contentContainerStyle={styles.muscleChips}
        showsHorizontalScrollIndicator={false}>
        {visibleMuscles.map((group) => {
          const selected = group.key === selectedMuscle;
          return (
            <Pressable
              key={group.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelectMuscle(group.key)}
              style={[
                styles.muscleChip,
                {
                  backgroundColor: selected ? gymColors.main : theme.backgroundElevated,
                  borderColor: selected ? gymColors.main : theme.separator,
                },
              ]}>
              <AppText variant="callout" color={selected ? 'onAccent' : 'secondary'}>
                {group.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  flex: { flex: 1 },
  sectionIntro: { gap: spacing.xxs },
  bodyMapStage: {
    position: 'relative',
    width: '100%',
  },
  bodyChromeBar: {
    gap: spacing.sm,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  bodyChromeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sexToggle: {
    flexDirection: 'row',
    gap: 2,
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 2,
  },
  sexToggleTab: {
    minHeight: 30,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  bodyViewDock: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 2,
  },
  atlasControlsInline: { gap: spacing.sm },
  bodyExperience: {
    overflow: 'hidden',
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radii.xl,
    boxShadow: '0 18px 45px rgba(54, 28, 20, 0.22)',
  },
  bodyTab: {
    minHeight: 30,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
  },
  bodyCaption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bodyCaptionCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  focusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: HIGHLIGHT_COLOR,
    boxShadow: '0 0 12px rgba(255, 122, 31, 0.85)',
  },
  muscleChips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xl,
  },
  muscleChip: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
  },
});
