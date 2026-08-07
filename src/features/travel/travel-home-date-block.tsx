import { StyleSheet, View } from 'react-native';

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
  const muted =
    theme.name === 'dark' ? theme.textSecondary : travelHomeTokens.colors.inkMuted;
  const ink =
    theme.name === 'dark' ? theme.textPrimary : travelHomeTokens.colors.ink;
  const brand =
    theme.name === 'dark' ? theme.accentPrimary : travelHomeTokens.colors.brandBlue;
  const dateSize = Math.max(15, s(travelHomeTokens.type.date + 1));

  return (
    <View
      style={styles.block}
      accessibilityRole="text"
      accessibilityLabel={`Trip dates ${rangeLabel}, ${days} ${days === 1 ? 'day' : 'days'}`}>
      <View style={styles.labelRow}>
        <AppText
          variant="caption"
          fit
          numberOfLines={1}
          style={{
            color: muted,
            fontFamily: travelHomeFontFamily,
            fontSize: Math.max(11, s(travelHomeTokens.type.metadataLabel - 1)),
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
              backgroundColor:
                theme.name === 'dark'
                  ? 'rgba(11, 99, 206, 0.22)'
                  : travelHomeTokens.colors.brandBlueSoft,
              paddingHorizontal: Math.max(7, s(8)),
              minHeight: Math.max(20, s(22)),
            },
          ]}>
          <AppText
            variant="caption"
            fit
            numberOfLines={1}
            style={{
              color: brand,
              fontFamily: travelHomeFontFamily,
              fontSize: Math.max(11, s(12)),
              fontWeight: '600',
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
          lineHeight: Math.max(18, s(20)),
          fontWeight: '700',
          letterSpacing: -0.2,
          flexShrink: 1,
          minWidth: 0,
          width: '100%',
        }}>
        {rangeLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  pill: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
