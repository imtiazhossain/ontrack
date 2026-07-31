import { Pressable, StyleSheet, View } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { AppText } from './app-text';

interface SectionHeaderProps {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, detail, actionLabel, onAction }: SectionHeaderProps) {
  const { spacing } = useResponsive();
  return (
    <View
      style={[
        styles.row,
        {
          gap: spacing.md,
          marginTop: spacing.xl,
          marginBottom: spacing.md,
        },
      ]}>
      <AppText variant="overline" color="tertiary" style={styles.title} fit>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}>
          <AppText variant="caption" color="accent" fit>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : detail ? (
        <AppText variant="caption" color="tertiary" style={styles.detail} fit>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  detail: {
    flexShrink: 1,
    maxWidth: '42%',
    textAlign: 'right',
  },
});
