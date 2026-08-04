import {
  type ImageSourcePropType,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii, type AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

const ACTION_SHADOW_LIGHT =
  '0 3px 10px rgba(51, 39, 28, 0.09), 0 1px 2px rgba(51, 39, 28, 0.04)';
const ACTION_SHADOW_DARK = '0 3px 12px rgba(0, 0, 0, 0.35)';

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
  const light = theme.name === 'light';
  const surface = light ? '#FFFFFF' : chrome.fieldBg;
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  // This control is a direct child of a wrapping two-column grid. Keep the
  // registration on the Pressable itself: a wrapper view changes the
  // percentage sizing context and collapses the label column.
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: handlePress,
  });
  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.action,
        {
          flexGrow: wide ? 1 : undefined,
          flexBasis: wide ? '100%' : '47%',
          backgroundColor: surface,
          borderColor: light ? 'rgba(51,39,28,0.04)' : chrome.fieldBorder,
          borderRadius: Math.max(14, s(16)),
          minHeight: Math.max(layout.minTapTarget, s(50)),
          paddingHorizontal: Math.max(10, rs.sm + 2),
          paddingVertical: Math.max(10, rs.sm),
          gap: Math.max(8, rs.sm - 2),
          boxShadow: light ? ACTION_SHADOW_LIGHT : ACTION_SHADOW_DARK,
          opacity: pressed ? 0.78 : 1,
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
        allowFontScaling={false}
        maxFontSizeMultiplier={1}
        numberOfLines={2}
        style={[
          styles.actionLabel,
          {
            color: chrome.label,
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
            fontSize: s(14),
            lineHeight: s(18),
          },
        ]}>
        {label}
      </AppText>
      <View style={styles.actionChevron}>
        <Symbol
          name="chevron-right"
          size={12}
          color={light ? '#B09A82' : chrome.subtitle}
        />
      </View>
    </Pressable>
  );
}

export function TravelSheetPrimaryAction({
  label,
  icon,
  onPress,
  editorialGold = true,
  flat = false,
  testID,
}: {
  label: string;
  icon?: AppIconName;
  onPress: () => void;
  editorialGold?: boolean;
  flat?: boolean;
  testID?: string;
}) {
  return (
    <ItinerarySheetSubmitButton
      label={label}
      icon={icon}
      editorialGold={editorialGold}
      flat={flat}
      testID={testID}
      onPress={onPress}
    />
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
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, layout } = useResponsive();
  const minHeight = Math.max(layout.minTapTarget, s(48));
  const surface = theme.name === 'light' ? '#F3EEE7' : chrome.fieldBg;
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  return (
    <AgentTestId testID={testID} label={label} onPress={handlePress}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.secondaryAction,
          {
            backgroundColor: surface,
            borderColor: chrome.fieldBorder,
            minHeight,
            paddingHorizontal: rs.lg,
            gap: rs.sm,
            borderRadius: radii.pill,
            opacity: pressed ? 0.78 : 1,
          },
        ]}>
        {icon ? <Symbol name={icon} size="sm" color={chrome.label} /> : null}
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={[
            styles.secondaryLabel,
            {
              color: chrome.label,
              fontFamily: fontFamilies.serif,
              fontSize: s(19),
              lineHeight: s(24),
            },
          ]}>
          {label}
        </AppText>
      </Pressable>
    </AgentTestId>
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
  const chrome = itinerarySheetChrome(theme);
  const accent = chrome.ctaFrom;
  const { s } = useResponsive();
  const dim = size ?? Math.max(36, s(36));
  const elevated =
    theme.name === 'light'
      ? {
          backgroundColor: tone === 'accent' ? '#F7F1E8' : '#FFFFFF',
          boxShadow:
            tone === 'accent'
              ? '0 3px 12px rgba(51, 39, 28, 0.14), 0 1px 3px rgba(160, 120, 80, 0.18)'
              : '0 4px 14px rgba(51, 39, 28, 0.14)',
        }
      : {
          backgroundColor: chrome.closeBg,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
        };
  // Card edit/collapse: charcoal icons on elevated white; header + keeps gold.
  const iconColor =
    tone === 'accent' ? accent : theme.name === 'light' ? '#2C241C' : theme.textPrimary;
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  return (
    <AgentTestId testID={testID} label={accessibilityLabel} onPress={handlePress}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.iconControl,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            ...elevated,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <Symbol name={icon} size={tone === 'accent' ? Math.max(18, s(20)) : 'sm'} color={iconColor} />
      </Pressable>
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  actionLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  actionChevron: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  secondaryLabel: {
    fontWeight: '400',
  },
  iconControl: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
