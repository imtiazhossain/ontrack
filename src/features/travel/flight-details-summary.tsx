import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import {
  calculateFlightArrival,
  formatFlightLandingLabel,
} from '@/features/travel/flight-arrival';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes } from '@/utils/date';

import { openConfirmationAttachments, confirmationUrisForDisplay } from './confirmation-attachments';
import { ConfirmationDocumentCue } from './confirmation-document-cue';
import { travelOverlineStyle } from './travel-chrome';
import type { TravelFlightDetails } from './types';

export function FlightDetailsSummary({
  details,
  date,
  startMinutes,
  durationMinutes,
}: {
  details: TravelFlightDetails;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
}) {
  const theme = useTheme();
  const route = [details.departureAirport, details.arrivalAirport]
    .filter(Boolean)
    .join(' → ');
  const carrier = [details.airline, details.flightNumber].filter(Boolean).join(' · ');
  const arrival =
    date !== undefined &&
    startMinutes !== undefined &&
    durationMinutes !== undefined
      ? calculateFlightArrival({
          date,
          startMinutes,
          durationMinutes,
          departureAirport: details.departureAirport,
          arrivalAirport: details.arrivalAirport,
        })
      : undefined;
  const confirmationUris = confirmationUrisForDisplay(
    details.confirmationUris,
    'flight',
  );
  const openConfirmation = () => {
    if (!confirmationUris.length) return;
    void openConfirmationAttachments(confirmationUris);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.accentFaint }]}>
      <View style={styles.header}>
        <Symbol name="airplane" size="sm" color={theme.accentPrimary} />
        <View style={styles.flex}>
          {route ? (
            <AppText variant="subheading" color="accent" fit>
              {route}
            </AppText>
          ) : null}
          {carrier ? (
            <AppText variant="caption" color="secondary" fit>
              {carrier}
            </AppText>
          ) : null}
        </View>
      </View>
      {arrival && startMinutes !== undefined ? (
        <View style={styles.detailRow}>
          <AppText variant="overline" color="tertiary" fit style={travelOverlineStyle}>
            Lands
          </AppText>
          <AppText variant="callout" color="accent" fit style={styles.detailValue}>
            {formatMinutes(startMinutes)} → {formatFlightLandingLabel(arrival)}
            {arrival.timeZoneAware ? ' local' : ''}
          </AppText>
        </View>
      ) : null}
      {details.confirmationCode ? (
        <Pressable
          accessibilityRole={confirmationUris.length ? 'button' : undefined}
          accessibilityLabel={
            confirmationUris.length
              ? 'View uploaded flight confirmation'
              : undefined
          }
          disabled={!confirmationUris.length}
          onPress={openConfirmation}
          style={styles.detailRow}>
          <AppText variant="overline" color="tertiary" fit style={travelOverlineStyle}>
            Confirmation
          </AppText>
          <AppText variant="callout" color="accent" selectable fit style={styles.detailValue}>
            {details.confirmationCode}
          </AppText>
        </Pressable>
      ) : null}
      {details.seat ? (
        <View style={styles.detailRow}>
          <AppText variant="overline" color="tertiary" fit style={travelOverlineStyle}>
            Seat
          </AppText>
          <AppText variant="callout" selectable fit style={styles.detailValue}>
            {details.seat}
          </AppText>
        </View>
      ) : null}
      <ConfirmationDocumentCue
        uris={details.confirmationUris}
        kind="flight"
        accessibilityLabel="View uploaded flight confirmation"
      />
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
  detailValue: { flexShrink: 1, minWidth: 0, textAlign: 'right' },
  flex: { flex: 1, minWidth: 0, flexShrink: 1, gap: spacing.xxs },
});
