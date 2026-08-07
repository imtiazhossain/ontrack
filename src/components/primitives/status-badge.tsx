import { StyleSheet, View } from 'react-native';

import { radii, type Theme } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import { fieldTitleCase } from './field-title-case';

export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export function statusBadgeToneColor(tone: StatusBadgeTone, theme: Theme): string {
  switch (tone) {
    case 'success':
      return theme.success;
    case 'warning':
      return theme.warning;
    case 'danger':
      return theme.danger;
    default:
      // Neutral sits on accentFaint — accent ink keeps contrast in dark travel.
      return theme.accentPrimary;
  }
}

/** Compact status pill with optional leading dot. */
export function StatusBadge({
  label,
  tone = 'neutral',
  showDot = true,
  testID,
}: {
  label: string;
  tone?: StatusBadgeTone;
  showDot?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const { spacing, s } = useResponsive();
  const color = statusBadgeToneColor(tone, theme);
  const title = fieldTitleCase(label);

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={title}
      style={[
        styles.badge,
        {
          gap: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: s(4),
          borderRadius: radii.pill,
          backgroundColor: theme.accentFaint,
        },
      ]}>
      {showDot ? (
        <View
          style={{
            width: s(8),
            height: s(8),
            borderRadius: radii.pill,
            backgroundColor: color,
          }}
        />
      ) : null}
      <AppText variant="caption" fit style={{ color, flexShrink: 1, minWidth: 0 }}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
});
