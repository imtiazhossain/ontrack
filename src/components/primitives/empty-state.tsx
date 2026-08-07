import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';
import { Button } from './button';
import { Symbol } from './symbol';

interface EmptyStateProps {
  icon: AppIconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
  titleStyle?: StyleProp<TextStyle>;
  messageStyle?: StyleProp<TextStyle>;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionTestID,
  titleStyle,
  messageStyle,
}: EmptyStateProps) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  return (
    <View
      style={[
        styles.container,
        {
          gap: spacing.md,
          paddingVertical: spacing.xxxl,
          paddingHorizontal: spacing.xl,
        },
      ]}>
      <Symbol name={icon} size={40} color={theme.textTertiary} />
      <AppText
        variant="heading"
        align="center"
        numberOfLines={2}
        adjustsFontSizeToFit
        style={titleStyle}>
        {title}
      </AppText>
      <AppText
        variant="callout"
        color="secondary"
        align="center"
        numberOfLines={4}
        style={messageStyle}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button
          variant="secondary"
          onPress={onAction}
          testID={actionTestID}
          accessibilityLabel={actionLabel}
          style={{ marginTop: spacing.sm }}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
