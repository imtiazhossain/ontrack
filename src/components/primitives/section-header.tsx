import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';
import { AppText } from './app-text';

interface SectionHeaderProps {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, detail, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="overline" color="tertiary">
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}>
          <AppText variant="caption" color="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : detail ? (
        <AppText variant="caption" color="tertiary">
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
    alignItems: 'baseline',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});
