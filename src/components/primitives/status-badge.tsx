import { type Theme } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

import { GlassTonePill } from './glass-tone-pill';

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
      return theme.accentPrimary;
  }
}

/** Compact status pill with optional leading dot — mist glass via GlassTonePill. */
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
  return (
    <GlassTonePill
      label={label}
      toneColor={statusBadgeToneColor(tone, theme)}
      showDot={showDot}
      testID={testID}
    />
  );
}
