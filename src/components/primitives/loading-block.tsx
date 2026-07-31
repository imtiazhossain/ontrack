import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

interface LoadingBlockProps {
  label?: string;
  /** Compact padding for inline loaders inside forms/lists. */
  compact?: boolean;
}

/** Shared centered loading indicator for screens and panels. */
export function LoadingBlock({ label, compact = false }: LoadingBlockProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <ActivityIndicator color={theme.accentPrimary} />
      {label ? (
        <AppText variant="callout" color="secondary" align="center">
          {label}
        </AppText>
      ) : null}
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
  compact: {
    paddingVertical: spacing.md,
  },
});
