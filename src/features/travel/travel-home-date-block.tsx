import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { tripDayCount } from '@/features/travel/date-range';
import {
  travelHomeFontFamily,
  travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import {
  formatTripDateRangeLabel,
  formatTripWeekdayRangeLabel,
} from '@/utils/date';

type TravelHomeDateBlockProps = {
  tripId: string;
  startDate: string;
  endDate: string;
};

/**
 * Footer date half — flex:1 peer of View Itinerary (Android CTA slightly wider).
 *
 * Calendar range on top; soft duration pill + weekday rule under — matches
 * the trip-card mock. Height is content-sized (do not stretch to CTA height
 * — that clips the range line).
 */
export function TravelHomeDateBlock({
  tripId,
  startDate,
  endDate,
}: TravelHomeDateBlockProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const days = tripDayCount(startDate, endDate);
  const rangeLabel = formatTripDateRangeLabel(startDate, endDate);
  const weekdayLabel = formatTripWeekdayRangeLabel(startDate, endDate);
  const dayUnit = days === 1 ? 'Day' : 'Days';
  const dayLabel = `${days} ${dayUnit}`;
  const dark = theme.name === 'dark';
  const ink = dark ? theme.textPrimary : travelHomeTokens.colors.ink;
  const muted = dark ? theme.textSecondary : travelHomeTokens.colors.inkMuted;
  const pillFg = dark ? theme.textPrimary : travelHomeTokens.colors.inkMuted;
  const pillBg = dark
    ? travelHomeTokens.colors.dayPillSurfaceDark
    : travelHomeTokens.colors.dayPillSurface;
  const dateSize = Math.max(18, s(travelHomeTokens.type.date));
  const dateLine =
    Platform.OS === 'ios' ? dateSize + 1 : Math.max(22, s(24));
  const weekdaySize = Math.max(12, s(13));
  const pillTextSize = Math.max(11, s(12));
  const pillPadH = Math.max(8, s(9));
  const pillMinH = Math.max(22, s(24));
  const accessibilityLabel = `Trip dates ${rangeLabel}${weekdayLabel ? `, ${weekdayLabel}` : ''}, ${dayLabel}`;

  return (
    <AgentTestId
      testID={AgentUiIds.travel.list.dates(tripId)}
      label={accessibilityLabel}
      style={styles.block}>
      <View
        style={styles.inner}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}>
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={{
            color: ink,
            fontFamily: travelHomeFontFamily,
            fontSize: dateSize,
            lineHeight: dateLine,
            fontWeight: '400',
            letterSpacing: -0.25,
            flexShrink: 1,
            minWidth: 0,
          }}>
          {rangeLabel}
        </AppText>
        <View style={[styles.metaRow, { gap: Math.max(8, s(8)) }]}>
          <View
            style={[
              styles.dayPill,
              {
                minHeight: pillMinH,
                paddingHorizontal: pillPadH,
                borderRadius: travelHomeTokens.radius.itineraryButton,
                backgroundColor: pillBg,
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{
                color: pillFg,
                fontFamily: travelHomeFontFamily,
                fontSize: pillTextSize,
                lineHeight: pillTextSize + 1,
                fontWeight: '500',
                letterSpacing: 0.2,
              }}>
              {dayLabel}
            </AppText>
          </View>
          {weekdayLabel ? (
            <AppText
              variant="caption"
              fit
              numberOfLines={1}
              style={{
                color: muted,
                fontFamily: travelHomeFontFamily,
                fontSize: weekdaySize,
                lineHeight: weekdaySize + 2,
                fontWeight: '400',
                letterSpacing: -0.1,
                flexShrink: 1,
                minWidth: 0,
              }}>
              {weekdayLabel}
            </AppText>
          ) : null}
        </View>
      </View>
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    // Content height — stretching to the CTA clips the range under overflow.
    alignSelf: 'center',
  },
  inner: {
    minWidth: 0,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderCurve: 'continuous',
  },
});
