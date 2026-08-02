import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { AppText } from './app-text';

interface SectionHeaderProps {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  titleStyle?: TextStyle;
  titleColor?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent' | 'danger' | 'success';
}

export function SectionHeader({
  title,
  detail,
  actionLabel,
  onAction,
  titleStyle,
  titleColor = 'tertiary',
}: SectionHeaderProps) {
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
      <AppText
        variant="overline"
        color={titleColor}
        style={[styles.title, titleStyle]}
        fit>
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
