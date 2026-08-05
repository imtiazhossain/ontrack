import { StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

/** Compact trip-card action using the app-wide shared button sizing. */
export function TravelSheetAction({
  label,
  icon,
  badgeIcon,
  tone,
  onPress,
  accessibilityLabel,
  wide = false,
  testID,
}: {
  label: string;
  icon: AppIconName;
  badgeIcon?: AppIconName;
  tone: SheetIconTone;
  onPress: () => void;
  accessibilityLabel: string;
  wide?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const iconTone = chrome.icons[tone];
  const { s, spacing } = useResponsive();
  const iconBox = Math.max(26, s(28));
  const badgeSize = Math.max(12, s(13));
  return (
    <Button
      variant="secondary"
      shape="rounded"
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      // One inner row owns icon+label centering.
      leading={
        <View style={[styles.actionContent, { gap: spacing.sm }]}>
          <View
            style={[
              styles.actionIcon,
              {
                width: iconBox,
                height: iconBox,
                borderRadius: Math.max(8, s(9)),
                backgroundColor: iconTone.bg,
              },
            ]}>
            <Symbol name={icon} size="sm" color={iconTone.fg} />
            {badgeIcon ? (
              <View
                style={[
                  styles.actionIconBadge,
                  {
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: theme.backgroundElevated,
                    borderColor: iconTone.bg,
                  },
                ]}>
                <Symbol name={badgeIcon} size={9} color={iconTone.fg} />
              </View>
            ) : null}
          </View>
          <AppText variant="callout" fit style={styles.actionLabel}>
            {label}
          </AppText>
        </View>
      }
      style={[
        styles.action,
        wide ? styles.actionWide : undefined,
        {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderColor: theme.separator,
        },
      ]}>
      {null}
    </Button>
  );
}

export function TravelSheetPrimaryAction({
  label,
  icon,
  onPress,
  editorialGold: _editorialGold = true,
  flat: _flat = false,
  flatColor: _flatColor,
  testID,
}: {
  label: string;
  icon?: AppIconName;
  onPress: () => void;
  editorialGold?: boolean;
  flat?: boolean;
  flatColor?: string;
  testID?: string;
}) {
  return (
    <Button
      variant="primary"
      icon={icon}
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}>
      {label}
    </Button>
  );
}

/** Soft cream secondary CTA matching Friends sheet mock (Invite a Friend). */
export function TravelSheetSecondaryAction({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon?: AppIconName;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Button
      variant="secondary"
      icon={icon}
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}>
      {label}
    </Button>
  );
}

/** Circular chrome control (edit / collapse / add) matching sheet close button. */
export function TravelSheetIconControl({
  icon,
  onPress,
  accessibilityLabel,
  size,
  iconSize,
  tone = 'default',
  testID,
}: {
  icon: AppIconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  /** `accent` = gold icon on elevated cream (page header +). */
  tone?: 'default' | 'accent';
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <IconButton
      icon={icon}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      size={size}
      iconSize={iconSize}
      color={tone === 'accent' ? theme.accentPrimary : theme.textPrimary}
      background={theme.backgroundSunken}
      borderColor={theme.separator}
    />
  );
}

const styles = StyleSheet.create({
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  actionIcon: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderCurve: 'continuous',
  },
  actionIconBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
  action: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 0,
    // Left-align icon+label so every tile in the 2-column grid shares one
    // icon column (center justify makes short labels drift vs long ones).
    justifyContent: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionWide: {
    flexBasis: '100%',
    // Full-width itinerary CTA stays centered as the primary next step.
    justifyContent: 'center',
  },
});
