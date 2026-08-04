import {
  type ImageSourcePropType,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { AppText, Button, Card, IconButton, Symbol } from '@/components/primitives';
import { radii, type AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

/** Soft elevated trip-card action tile matching the travel mock. */
export function TravelSheetAction({
  label,
  icon,
  iconImage,
  tone,
  onPress,
  accessibilityLabel,
  wide,
  testID,
}: {
  label: string;
  icon: AppIconName;
  /** Optional bitmap glyph; replaces the SF Symbol when set. */
  iconImage?: ImageSourcePropType;
  tone: SheetIconTone;
  onPress: () => void;
  accessibilityLabel: string;
  wide?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const iconTone = chrome.icons[tone];
  const { s, spacing: rs, layout } = useResponsive();
  const iconBox = Math.max(30, s(32));
  return (
    <Card
      padded={false}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.action,
        {
          flexGrow: wide ? 1 : undefined,
          flexBasis: wide ? '100%' : '47%',
          minHeight: Math.max(layout.minTapTarget, s(68)),
          paddingHorizontal: Math.max(10, rs.sm + 2),
          paddingVertical: Math.max(10, rs.sm),
          gap: Math.max(8, rs.sm - 2),
        },
      ]}>
      <View
        style={{
          width: iconBox,
          height: iconBox,
          borderRadius: Math.max(9, s(10)),
          borderCurve: 'continuous',
          backgroundColor: iconTone.bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
        {iconImage ? (
          <Image
            source={iconImage}
            style={{ width: iconBox - 2, height: iconBox - 2, borderRadius: Math.max(8, s(8)) }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Symbol name={icon} size="sm" color={iconTone.fg} />
        )}
      </View>
      <AppText
        variant="callout"
        numberOfLines={2}
        style={[
          styles.actionLabel,
          {
            color: chrome.label,
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
          },
        ]}>
        {label}
      </AppText>
    </Card>
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
      size="lg"
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
  tone = 'default',
  testID,
}: {
  icon: AppIconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
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
      color={tone === 'accent' ? theme.accentPrimary : theme.textPrimary}
      background={theme.backgroundSunken}
      borderColor={theme.separator}
    />
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: radii.lg,
  },
  actionLabel: {
    minWidth: 0,
    textAlignVertical: 'center',
  },
});
