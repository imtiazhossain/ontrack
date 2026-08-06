import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import { Button } from './button';

export interface DestructiveSectionProps {
  label: string;
  description?: string;
  onPress: () => void;
  testID: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
  /**
   * Drop the standalone top rule / padding when nested in `DangerZone`
   * (or another parent that owns the chrome).
   */
  flush?: boolean;
}

/** Canonical placement and presentation for an already-confirmed destructive intent. */
export function DestructiveSection({
  label,
  description,
  onPress,
  testID,
  accessibilityLabel = label,
  style,
  flush = false,
}: DestructiveSectionProps) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  return (
    <View
      style={[
        styles.root,
        flush
          ? { gap: spacing.sm }
          : {
              gap: spacing.md,
              paddingTop: spacing.lg,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.separator,
            },
        style,
      ]}>
      {description ? (
        <AppText variant="callout" color="secondary">
          {description}
        </AppText>
      ) : null}
      <Button
        variant="danger"
        icon="delete"
        onPress={onPress}
        testID={testID}
        accessibilityLabel={accessibilityLabel}>
        {label}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
});
