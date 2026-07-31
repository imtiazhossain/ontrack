import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { layout, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

import { balloonColor, balloonFill } from './colors';
import type { BalloonColorId } from './types';

interface BalloonPopHudProps {
  level: number;
  remainingSec: number;
  targetColorId: BalloonColorId;
  targetsLeft: number;
  score: number;
  timerFlash?: boolean;
  onClose: () => void;
}

export function BalloonPopHud({
  level,
  remainingSec,
  targetColorId,
  targetsLeft,
  score,
  timerFlash = false,
  onClose,
}: BalloonPopHudProps) {
  const theme = useTheme();
  const fill = balloonFill(targetColorId, theme.name === 'dark');
  const label = balloonColor(targetColorId).label;
  const seconds = Math.ceil(remainingSec);

  return (
    <View style={styles.row}>
      <View style={styles.block}>
        <AppText variant="caption" color="secondary">
          Level
        </AppText>
        <AppText variant="heading">{level}</AppText>
      </View>

      <View style={[styles.target, { backgroundColor: theme.backgroundSunken }]}>
        <View style={[styles.swatch, { backgroundColor: fill }]} />
        <View style={styles.targetCopy}>
          <AppText variant="caption" color="secondary">
            Pop
          </AppText>
          <AppText variant="bodyMedium">{label}</AppText>
        </View>
        <AppText variant="caption" color="secondary">
          {targetsLeft} left
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close game"
          hitSlop={8}
          onPress={() => {
            haptics.select();
            onClose();
          }}
          style={styles.close}>
          <Symbol name="close" size="sm" color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.block}>
        <AppText variant="caption" color="secondary">
          Time
        </AppText>
        <AppText
          variant="heading"
          color={timerFlash || seconds <= 5 ? 'danger' : 'primary'}>
          {seconds}s
        </AppText>
      </View>

      <View style={styles.block}>
        <AppText variant="caption" color="secondary">
          Score
        </AppText>
        <AppText variant="heading">{score}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  block: {
    alignItems: 'center',
    minWidth: 44,
  },
  target: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radii.lg,
  },
  targetCopy: {
    flex: 1,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
  },
  close: {
    minWidth: layout.minTapTarget,
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
