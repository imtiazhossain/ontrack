import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii, type AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

/** Soft field pill matching Add Stay sheet inputs. */
export function TravelSheetAction({
  label,
  icon,
  tone,
  onPress,
  accessibilityLabel,
  wide,
}: {
  label: string;
  icon: AppIconName;
  tone: SheetIconTone;
  onPress: () => void;
  accessibilityLabel: string;
  wide?: boolean;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const iconTone = chrome.icons[tone];
  const { s, spacing: rs, layout } = useResponsive();
  const iconBox = Math.max(28, s(30));
  const surface = theme.name === 'light' ? '#FFFEFC' : chrome.fieldBg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.action,
        {
          flexGrow: wide ? 1 : undefined,
          flexBasis: wide ? '100%' : '47%',
          backgroundColor: surface,
          borderColor: chrome.fieldBorder,
          borderRadius: radii.lg,
          minHeight: Math.max(layout.minTapTarget, s(48)),
          paddingHorizontal: rs.md,
          paddingVertical: rs.sm,
          gap: rs.sm,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      <View
        style={{
          width: iconBox,
          height: iconBox,
          borderRadius: radii.sm,
          borderCurve: 'continuous',
          backgroundColor: iconTone.bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <Symbol name={icon} size="sm" color={iconTone.fg} />
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
          size={11}
          color={theme.name === 'light' ? '#9A876C' : chrome.subtitle}
        />
      </View>
    </Pressable>
  );
}

export function TravelSheetPrimaryAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: AppIconName;
  onPress: () => void;
}) {
  return (
    <ItinerarySheetSubmitButton
      label={label}
      icon={icon}
      editorialGold
      onPress={onPress}
    />
  );
}

/** Circular chrome control (edit / collapse / add) matching sheet close button. */
export function TravelSheetIconControl({
  icon,
  onPress,
  accessibilityLabel,
  size,
  tone = 'default',
}: {
  icon: AppIconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  /** `accent` = gold icon on elevated cream (page header +). */
  tone?: 'default' | 'accent';
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
              ? '0 2px 10px rgba(51, 39, 28, 0.14)'
              : '0 4px 14px rgba(51, 39, 28, 0.14)',
        }
      : {
          backgroundColor: chrome.closeBg,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
        };
  // Card edit/collapse: charcoal icons on elevated white; header + keeps gold.
  const iconColor =
    tone === 'accent' ? accent : theme.name === 'light' ? '#2C241C' : theme.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
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
      <Symbol name={icon} size="sm" color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actionLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  actionChevron: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  iconControl: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
