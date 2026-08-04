import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import { IconButton } from './button';
import { Symbol } from './symbol';

export interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Canonical dismiss control. When present it always renders as the top-right neutral X. */
  onClose?: () => void;
  closeAccessibilityLabel?: string;
  closeTestID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Shared page/sheet hierarchy. Feature themes can recolor it but cannot restyle its actions. */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  subtitleIcon,
  leading,
  trailing,
  onClose,
  closeAccessibilityLabel = 'Close',
  closeTestID,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const { spacing } = useResponsive();

  return (
    <View style={[styles.root, { gap: spacing.md }, style]}>
      {leading ? <View style={styles.action}>{leading}</View> : null}
      <View style={[styles.copy, { gap: spacing.xs }]}>
        {eyebrow ? (
          <AppText variant="overline" color="accent" fit>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title" fit>
          {title}
        </AppText>
        {subtitle ? (
          <View style={[styles.subtitleRow, { gap: spacing.xs }]}>
            {subtitleIcon ? (
              <Symbol name={subtitleIcon} size="sm" color={theme.textSecondary} />
            ) : null}
            <AppText variant="callout" color="secondary" style={styles.subtitle}>
              {subtitle}
            </AppText>
          </View>
        ) : null}
      </View>
      {trailing ? <View style={styles.action}>{trailing}</View> : null}
      {onClose ? (
        <View style={styles.action}>
          <IconButton
            icon="close"
            onPress={onClose}
            accessibilityLabel={closeAccessibilityLabel}
            testID={closeTestID}
            background={theme.backgroundSunken}
            borderColor={theme.separator}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  action: {
    flexShrink: 0,
  },
});
