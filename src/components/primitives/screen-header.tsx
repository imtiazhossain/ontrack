import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import { IconButton } from './button';
import { fieldTitleCase } from './field-title-case';
import { Symbol } from './symbol';

export interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Optional decorative layer behind the title copy. */
  decoration?: ReactNode;
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
  decoration,
  onClose,
  closeAccessibilityLabel = 'Close',
  closeTestID,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const { spacing } = useResponsive();

  const closeControl = onClose ? (
    <IconButton
      icon="close"
      onPress={onClose}
      accessibilityLabel={closeAccessibilityLabel}
      testID={closeTestID}
      background={theme.backgroundSunken}
      borderColor={theme.separator}
    />
  ) : null;

  const trailingSlot =
    trailing || closeControl ? (
      <View style={[styles.actions, { gap: spacing.sm }]}>
        {trailing ? <View style={styles.action}>{trailing}</View> : null}
        {closeControl ? <View style={styles.action}>{closeControl}</View> : null}
      </View>
    ) : null;

  const subtitleBlock = subtitle ? (
    <View style={[styles.subtitleRow, { gap: spacing.xs }]}>
      {subtitleIcon ? <Symbol name={subtitleIcon} size="sm" color={theme.textSecondary} /> : null}
      <AppText variant="callout" color="secondary" style={styles.subtitle}>
        {subtitle}
      </AppText>
    </View>
  ) : null;

  const titleBlock = (
    <AppText variant="title" fit>
      {fieldTitleCase(title)}
    </AppText>
  );

  // Flourish sits behind the title only so long subtitles stay readable.
  const decoratedTitle = decoration ? (
    <View style={styles.copyDecorated}>
      <View style={styles.decoration} pointerEvents="none">
        {decoration}
      </View>
      <View style={styles.copyForeground}>{titleBlock}</View>
    </View>
  ) : (
    titleBlock
  );

  // Compact back stays on the eyebrow band; title + subtitle share the page left edge.
  if (leading && eyebrow) {
    return (
      <View style={[styles.stack, { gap: spacing.xs }, style]}>
        <View style={[styles.eyebrowRow, { gap: spacing.xs }]}>
          <View style={styles.action}>{leading}</View>
          <AppText variant="overline" color="accent" fit style={styles.eyebrow}>
            {eyebrow}
          </AppText>
          {trailingSlot}
        </View>
        {decoratedTitle}
        {subtitleBlock}
      </View>
    );
  }

  return (
    <View style={[styles.root, { gap: spacing.sm }, style]}>
      {leading ? <View style={styles.action}>{leading}</View> : null}
      <View style={[styles.copy, { gap: spacing.xs }]}>
        {eyebrow ? (
          <AppText variant="overline" color="accent" fit>
            {eyebrow}
          </AppText>
        ) : null}
        {decoratedTitle}
        {subtitleBlock}
      </View>
      {trailingSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stack: {
    width: '100%',
  },
  eyebrowRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  copyDecorated: {
    position: 'relative',
    overflow: 'visible',
    minWidth: 0,
    flexShrink: 1,
  },
  decoration: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  copyForeground: {
    zIndex: 1,
    elevation: 1,
    minWidth: 0,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  action: {
    flexShrink: 0,
  },
});
