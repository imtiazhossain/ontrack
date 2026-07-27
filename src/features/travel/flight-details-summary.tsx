import { StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

import type { TravelFlightDetails } from './types';

export function FlightDetailsSummary({ details }: { details: TravelFlightDetails }) {
  const theme = useTheme();
  const route = [details.departureAirport, details.arrivalAirport]
    .filter(Boolean)
    .join(' → ');
  const carrier = [details.airline, details.flightNumber].filter(Boolean).join(' · ');

  return (
    <View style={[styles.container, { backgroundColor: theme.accentFaint }]}>
      <View style={styles.header}>
        <Symbol name="airplane" size="sm" color={theme.accentPrimary} />
        <View style={styles.flex}>
          {route ? <AppText variant="subheading" color="accent">{route}</AppText> : null}
          {carrier ? <AppText variant="caption" color="secondary">{carrier}</AppText> : null}
        </View>
      </View>
      {details.confirmationCode ? (
        <View style={styles.detailRow}>
          <AppText variant="overline" color="tertiary">Confirmation</AppText>
          <AppText variant="callout" color="accent" selectable>
            {details.confirmationCode}
          </AppText>
        </View>
      ) : null}
      {details.seat ? (
        <View style={styles.detailRow}>
          <AppText variant="overline" color="tertiary">Seat</AppText>
          <AppText variant="callout" selectable>{details.seat}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: { flex: 1, gap: spacing.xxs },
});
