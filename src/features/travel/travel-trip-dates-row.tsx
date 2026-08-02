import { StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import {
  TRAVEL_EDITORIAL_ACCENT,
  travelCardFill,
  travelPillBg,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

const TRAVEL_DATE_SHADOW = '0 2px 8px rgba(51, 39, 28, 0.08)';

/** Gold calendar well matching the trip-dates mock (not the pink sheet calendar tone). */
const DATE_ICON_WELL_LIGHT = '#F5F0E8';
const DATE_ICON_WELL_DARK = 'rgba(212,165,116,0.18)';
const DATE_BADGE_BORDER_LIGHT = 'rgba(201, 164, 106, 0.38)';
const DATE_BADGE_BORDER_DARK = '#D4A574';
const DATE_BADGE_FILL_LIGHT = '#F7F2E9';

interface TravelTripDatesRowProps {
  startLabel: string;
  endLabel: string;
  dayCount: number;
  compact?: boolean;
}

/** Trip-card dates strip — cream bar, gold calendar, outlined duration pill. */
export function TravelTripDatesRow({
  startLabel,
  endLabel,
  dayCount,
  compact = false,
}: TravelTripDatesRowProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, typography } = useResponsive();
  const light = theme.name === 'light';
  const gold = light ? TRAVEL_EDITORIAL_ACCENT : chrome.ctaFrom;
  const badgeBorder = light ? DATE_BADGE_BORDER_LIGHT : DATE_BADGE_BORDER_DARK;
  const iconBox = compact ? Math.max(24, s(26)) : Math.max(32, s(34));
  const daysLabel = `${dayCount} ${dayCount === 1 ? 'Day' : 'Days'}`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Trip dates ${startLabel} to ${endLabel}, ${daysLabel}`}
      style={[
        styles.row,
        {
          backgroundColor: compact ? travelCardFill(theme) : travelPillBg(theme),
          borderColor: light ? 'rgba(180,150,110,0.28)' : chrome.fieldBorder,
          boxShadow: compact ? TRAVEL_DATE_SHADOW : undefined,
          minHeight: compact ? Math.max(40, s(40)) : Math.max(60, s(62)),
          paddingHorizontal: compact ? rs.md : rs.lg,
          paddingVertical: compact ? rs.xxs : rs.sm,
          gap: rs.md,
          borderRadius: compact ? Math.max(9, s(10)) : Math.max(16, s(18)),
        },
      ]}>
      <View
        style={[
          styles.iconWell,
          {
            width: iconBox,
            height: iconBox,
            backgroundColor: light ? DATE_ICON_WELL_LIGHT : DATE_ICON_WELL_DARK,
          },
        ]}>
        <Symbol name="calendar" size={compact ? 18 : 'sm'} color={gold} />
      </View>
      <View style={styles.copy}>
        {!compact ? (
          <AppText
            variant="caption"
            numberOfLines={1}
            style={[
              styles.serif,
              {
                color: chrome.subtitle,
                fontSize: Math.max(13, typography.caption.fontSize),
                lineHeight: Math.max(17, s(17)),
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
                : Math.max(17, typography.callout.fontSize + 2),
              lineHeight: compact
                ? Math.max(18, typography.caption.lineHeight)
                : Math.max(23, s(23)),
            },
          ]}>
          {`${startLabel} → ${endLabel}`}
        </AppText>
      </View>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: light ? DATE_BADGE_FILL_LIGHT : 'transparent',
            borderColor: badgeBorder,
            minHeight: compact ? Math.max(18, s(18)) : Math.max(32, s(34)),
            paddingHorizontal: compact ? rs.xs : Math.max(14, rs.md),
            borderWidth: compact ? StyleSheet.hairlineWidth : 1,
          },
        ]}>
        <AppText
          variant="caption"
          fit
          numberOfLines={1}
          style={[
            styles.badgeLabel,
            {
              color: gold,
              fontSize: compact
                ? Math.max(10, s(10))
                : Math.max(13, typography.caption.fontSize + 1),
            },
          ]}>
          {daysLabel}
        </AppText>
      </View>
    </View>
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
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  dates: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.25,
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
});
