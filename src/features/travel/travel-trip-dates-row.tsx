import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { travelCardFill, travelPillBg } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

const TRAVEL_DATE_SHADOW = '0 2px 8px rgba(17, 74, 110, 0.10)';

interface TravelTripDatesRowProps {
  startLabel: string;
  endLabel: string;
  dayCount: number;
  compact?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Trip-card dates strip — cream bar, gold calendar, outlined duration pill. */
export function TravelTripDatesRow({
  startLabel,
  endLabel,
  dayCount,
  compact = false,
  onPress,
  testID,
}: TravelTripDatesRowProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, typography } = useResponsive();
  const calendarTone = chrome.icons.calendar;
  const iconBox = compact ? Math.max(24, s(26)) : Math.max(34, s(36));
  const daysLabel = `${dayCount} ${dayCount === 1 ? 'Day' : 'Days'}`;
  const accessibilityLabel = `Trip dates ${startLabel} to ${endLabel}, ${daysLabel}`;
  const handlePress = () => {
    haptics.tap();
    onPress?.();
  };
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: onPress ? handlePress : undefined,
  });
  const rowStyle = [
    styles.row,
    {
      backgroundColor: compact ? travelCardFill(theme) : travelPillBg(theme),
      borderColor: chrome.fieldBorder,
      boxShadow: TRAVEL_DATE_SHADOW,
      minHeight: compact ? Math.max(40, s(40)) : Math.max(58, s(60)),
      paddingHorizontal: compact ? rs.md : rs.lg,
      paddingVertical: compact ? rs.xxs : rs.sm,
      gap: rs.md,
      borderRadius: compact ? Math.max(9, s(10)) : Math.max(16, s(18)),
    },
  ];

  const content = (
    <>
      <View
        style={[
          styles.iconWell,
          {
            width: iconBox,
            height: iconBox,
            backgroundColor: calendarTone.bg,
            boxShadow: theme.name === 'light' ? TRAVEL_DATE_SHADOW : undefined,
          },
        ]}>
        <Symbol name="calendar" size={compact ? 18 : 'sm'} color={calendarTone.fg} />
      </View>
      <View style={styles.copy}>
        {!compact ? (
          <AppText
            variant="caption"
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: chrome.subtitle,
                fontSize: Math.max(12, typography.caption.fontSize - 0.5),
                lineHeight: Math.max(16, s(16)),
              },
            ]}>
            Trip Dates
          </AppText>
        ) : null}
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={[
            styles.dates,
            {
              color: chrome.title,
              fontSize: compact
                ? Math.max(13, typography.caption.fontSize)
                : Math.max(16, typography.callout.fontSize + 1),
              lineHeight: compact
                ? Math.max(18, typography.caption.lineHeight)
                : Math.max(22, s(22)),
            },
          ]}>
          {`${startLabel} → ${endLabel}`}
        </AppText>
      </View>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.accentSoft,
            minHeight: compact ? Math.max(18, s(18)) : Math.max(30, s(32)),
            paddingHorizontal: compact ? rs.xs : Math.max(12, rs.md),
            borderWidth: compact ? StyleSheet.hairlineWidth : 1.25,
          },
        ]}>
        <AppText
          variant="caption"
          fit
          numberOfLines={1}
          style={[
            styles.badgeLabel,
            {
              color: theme.accentPrimary,
              fontSize: compact
                ? Math.max(10, s(10))
                : Math.max(14, typography.caption.fontSize + 1.5),
            },
          ]}>
          {daysLabel}
        </AppText>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={accessibilityLabel} style={rowStyle}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens a calendar to change the trip dates"
      onPress={handlePress}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  iconWell: {
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  dates: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  badge: {
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '500',
  },
  pressed: { opacity: 0.72 },
});
