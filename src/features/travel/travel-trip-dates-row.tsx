import { StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { TRAVEL_EDITORIAL_ACCENT, travelPillBg } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

/** Gold calendar well matching the trip-dates mock (not the pink sheet calendar tone). */
const DATE_ICON_WELL_LIGHT = '#E8DCC8';
const DATE_ICON_WELL_DARK = 'rgba(212,165,116,0.18)';
const DATE_BADGE_BORDER_LIGHT = '#C9A46A';
const DATE_BADGE_BORDER_DARK = '#D4A574';
const DATE_BADGE_FILL_LIGHT = '#F7F2E9';

interface TravelTripDatesRowProps {
  startLabel: string;
  endLabel: string;
  dayCount: number;
}

/** Trip-card dates strip — cream bar, gold calendar, outlined duration pill. */
export function TravelTripDatesRow({ startLabel, endLabel, dayCount }: TravelTripDatesRowProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, typography } = useResponsive();
  const light = theme.name === 'light';
  const gold = light ? TRAVEL_EDITORIAL_ACCENT : chrome.ctaFrom;
  const badgeBorder = light ? DATE_BADGE_BORDER_LIGHT : DATE_BADGE_BORDER_DARK;
  const iconBox = Math.max(34, s(36));
  const daysLabel = `${dayCount} ${dayCount === 1 ? 'day' : 'days'}`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Trip dates ${startLabel} to ${endLabel}, ${daysLabel}`}
      style={[
        styles.row,
        {
          backgroundColor: travelPillBg(theme),
          borderColor: light ? 'rgba(180,150,110,0.28)' : chrome.fieldBorder,
          minHeight: Math.max(68, s(72)),
          paddingHorizontal: rs.lg,
          paddingVertical: rs.md,
          gap: rs.md,
          borderRadius: Math.max(16, s(18)),
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
        <Symbol name="calendar" size="sm" color={gold} />
      </View>
      <View style={styles.copy}>
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
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={[
            styles.dates,
            {
              color: chrome.title,
              fontSize: Math.max(17, typography.callout.fontSize + 2),
              lineHeight: Math.max(23, s(23)),
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
            minHeight: Math.max(32, s(34)),
            paddingHorizontal: Math.max(14, rs.md),
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
              fontSize: Math.max(13, typography.caption.fontSize + 1),
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
