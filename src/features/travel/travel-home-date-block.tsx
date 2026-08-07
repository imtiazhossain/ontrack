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
 * Footer date half — flex:1 peer of View Itinerary (invisible 50/50 split).
 *
 * iOS Times New Roman sits optically low; nudge + tight lineHeight keep the
 * range on the same midline as the CTA.
 */
export function TravelHomeDateBlock({
  startDate,
  endDate,
}: TravelHomeDateBlockProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const days = tripDayCount(startDate, endDate);
  const rangeLabel = formatTripDateRangeLabel(startDate, endDate);
  const dark = theme.name === 'dark';
  const ink =
    dark ? theme.textPrimary : travelHomeTokens.colors.ink;
  const dateSize = Math.max(18, s(travelHomeTokens.type.date));
  const dateLine =
    Platform.OS === 'ios' ? dateSize + 1 : Math.max(22, s(24));

  return (
    <View
      style={styles.block}
      accessibilityRole="text"
      accessibilityLabel={`Trip dates ${rangeLabel}, ${days} ${days === 1 ? 'day' : 'days'}`}>
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
          width: '100%',
          // Optical midline with the itinerary pill (TNR glyph box sits low).
          ...(Platform.OS === 'ios' ? { transform: [{ translateY: -1 }] } : null),
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
    justifyContent: 'center',
  },
});
