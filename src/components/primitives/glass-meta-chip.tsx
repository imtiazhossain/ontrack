import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { glassMistPillShellStyle } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';

import { GlassPlate } from './glass-plate';

type GlassMetaChipProps = {
  children: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Mist glass meta chip for icon+label rows (gates, layovers, hub badges).
 * Prefer over solid `backgroundSunken` / `accentFaint` pills on glass boards.
 */
export function GlassMetaChip({
  children,
  testID,
  accessibilityLabel,
  style,
}: GlassMetaChipProps) {
  const { spacing, s } = useResponsive();

  return (
    <GlassPlate
      mist
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.chip,
        glassMistPillShellStyle({ spacingSm: spacing.sm, s }),
        style,
      ]}>
      <View style={[styles.content, { gap: spacing.xxs }]}>{children}</View>
    </GlassPlate>
  );
}

const styles = StyleSheet.create({
  chip: {
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
