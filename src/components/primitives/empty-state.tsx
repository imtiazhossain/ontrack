import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import { Button } from './button';
import { Symbol } from './symbol';

interface EmptyStateProps {
  icon: SymbolViewProps['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Symbol name={icon} size={40} color={theme.textTertiary} />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText variant="callout" color="secondary" align="center">
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button variant="secondary" onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  action: {
    marginTop: spacing.sm,
  },
});
