import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { tripDayCount } from '@/features/travel/date-range';
import {
  travelHomeFontFamily,
  travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatTripDateRangeLabel } from '@/utils/date';

type TravelHomeDateBlockProps = {
  startDate: string;
  endDate: string;
};

/**
 * Footer dates cluster: DATES + duration pill on one row, date range below.
 * Duration stays title case (`7 Days`), not mock all-caps.
 * Pill is a solid brand tint (not glass) so Android matches iOS — glass wash
 * was bleaching the chip into a white outlined badge.
 *
 * iOS Times New Roman has looser leading than Android `serif`; keep lineHeights
 * and row gaps tight so this cluster optically centers with the itinerary CTA.
 */
export function TravelHomeDateBlock({
  startDate,
  endDate,
}: TravelHomeDateBlockProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const days = tripDayCount(startDate, endDate);
  const durationLabel = `${days} ${days === 1 ? 'Day' : 'Days'}`;
  const rangeLabel = formatTripDateRangeLabel(startDate, endDate);
  const dark = theme.name === 'dark';
  const muted =
    dark ? theme.textSecondary : travelHomeTokens.colors.inkMuted;
  const ink =
    dark ? theme.textPrimary : travelHomeTokens.colors.ink;
  const brand =
    dark ? theme.accentPrimary : travelHomeTokens.colors.brandBlue;
  const labelSize = Math.max(11, s(travelHomeTokens.type.metadataLabel - 1));
  const pillSize = Math.max(11, s(12));
  const dateSize = Math.max(15, s(travelHomeTokens.type.date + 1));
  // iOS TNR: match cap-height + a hair of leading. Android platform serif
  // already reads balanced with the slightly roomier defaults.
  const labelLine =
    Platform.OS === 'ios' ? labelSize + 1 : Math.max(14, Math.round(labelSize * 1.25));
  const pillLine =
    Platform.OS === 'ios' ? pillSize + 1 : Math.max(14, Math.round(pillSize * 1.25));
  const dateLine =
    Platform.OS === 'ios' ? dateSize + 2 : Math.max(18, s(20));
  const clusterGap = Platform.OS === 'ios' ? 6 : 3;
  const labelGap = Platform.OS === 'ios' ? Math.max(8, s(9)) : 8;

  return (
    <View
      style={[styles.block, Platform.OS === 'ios' ? styles.blockIos : null]}
      accessibilityRole="text"
      accessibilityLabel={`Trip dates ${rangeLabel}, ${days} ${days === 1 ? 'day' : 'days'}`}>
      <View style={[styles.cluster, { gap: clusterGap }]}>
        <View style={[styles.labelRow, { gap: labelGap }]}>
          <AppText
            variant="caption"
            numberOfLines={1}
            style={{
              color: muted,
              fontFamily: travelHomeFontFamily,
              fontSize: labelSize,
              lineHeight: labelLine,
              fontWeight: '400',
              letterSpacing: 0.8,
              flexShrink: 1,
              minWidth: 0,
            }}>
            DATES
          </AppText>
          <View
            style={[
              styles.pill,
              {
                paddingHorizontal: Math.max(7, s(8)),
                paddingVertical: Platform.OS === 'ios' ? 3 : 2,
                minHeight: Math.max(20, s(22)),
                backgroundColor: dark
                  ? 'rgba(47, 111, 237, 0.22)'
                  : travelHomeTokens.colors.brandBlueSoft,
              },
            ]}>
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{
                color: brand,
                fontFamily: travelHomeFontFamily,
                fontSize: pillSize,
                lineHeight: pillLine,
                fontWeight: '400',
              }}>
              {durationLabel}
            </AppText>
          </View>
        </View>
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
            letterSpacing: -0.2,
            flexShrink: 1,
            minWidth: 0,
          }}>
          {rangeLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  /** Stretch to the itinerary button height so justifyContent can true-center. */
  blockIos: {
    alignSelf: 'stretch',
  },
  cluster: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  pill: {
    borderRadius: travelHomeTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
