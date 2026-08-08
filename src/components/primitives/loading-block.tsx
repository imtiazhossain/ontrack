import { StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { AppText } from './app-text';
import { GlassPlate } from './glass-plate';
import { LoadingSpinner } from './loading-spinner';

interface LoadingBlockProps {
  label?: string;
  /** Compact padding for inline loaders inside forms/lists. */
  compact?: boolean;
  /**
   * `glass` = airy frost capsule for atmosphere-backed full-screen loaders
   * (app launch). Default stays a plain centered spinner for inline use.
   */
  surface?: 'plain' | 'glass';
}

/** Shared centered loading indicator for screens and panels. */
export function LoadingBlock({
  label,
  compact = false,
  surface = 'plain',
}: LoadingBlockProps) {
  const { s } = useResponsive();
  const spinner = (
    <LoadingSpinner size={compact ? Math.max(22, s(24)) : Math.max(28, s(32))} />
  );
  const caption = label ? (
    <AppText variant="callout" color="secondary" align="center" fit={compact}>
      {label}
    </AppText>
  ) : null;

  if (surface === 'glass') {
    return (
      <GlassPlate
        airy
        style={[
          styles.container,
          styles.glass,
          compact && styles.compact,
          {
            paddingHorizontal: spacing.xl,
            borderRadius: radii.xl,
          },
        ]}>
        {spinner}
        {caption}
      </GlassPlate>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {spinner}
      {caption}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  glass: {
    alignSelf: 'center',
    paddingVertical: spacing.lg,
  },
  compact: {
    paddingVertical: spacing.md,
  },
});
