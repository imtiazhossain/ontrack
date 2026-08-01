import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatMinutes, type DateDisplayFormat } from '@/utils/date';

import {
  confirmationUrisForDisplay,
  openConfirmationAttachments,
} from './confirmation-attachments';
import { ConfirmationDocumentCue } from './confirmation-document-cue';
import { travelOverlineStyle } from './travel-chrome';
import type { TravelRentalDetails } from './types';

function formatStamp(
  date: string | undefined,
  minutes: number | undefined,
  dateDisplayFormat: DateDisplayFormat,
): string | undefined {
  const parts = [
    date ? formatDateKey(date, dateDisplayFormat) : undefined,
    minutes !== undefined ? formatMinutes(minutes) : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export function RentalDetailsSummary({
  details,
  pickupDate,
  pickupMinutes,
  dateDisplayFormat = 'mdy',
}: {
  details: TravelRentalDetails;
  /** Itinerary pick-up day (YYYY-MM-DD). */
  pickupDate?: string;
  /** Minutes from midnight for pick-up. */
  pickupMinutes?: number;
  dateDisplayFormat?: DateDisplayFormat;
}) {
  const theme = useTheme();
  const pickupStamp = formatStamp(pickupDate, pickupMinutes, dateDisplayFormat);
  const dropoffStamp = formatStamp(
    details.dropoffDate,
    details.dropoffMinutes,
    dateDisplayFormat,
  );
  const confirmationUris = confirmationUrisForDisplay(
    details.confirmationUris,
    'rental',
  );
  const openConfirmation = () => {
    if (!confirmationUris.length) return;
    void openConfirmationAttachments(confirmationUris);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.accentFaint }]}>
      <View style={styles.header}>
        <Symbol name="vehicles" size="sm" color={theme.accentPrimary} />
        <View style={styles.flex}>
          {details.company ? (
            <AppText variant="subheading" color="accent" fit>
              {details.company}
            </AppText>
          ) : null}
        </View>
      </View>
      {details.confirmationCode ? (
        <Pressable
          accessibilityRole={confirmationUris.length ? 'button' : undefined}
          accessibilityLabel={
            confirmationUris.length
              ? 'View uploaded rental confirmation'
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
      {details.vehicleClass ? (
        <View style={styles.detailRow}>
          <AppText variant="overline" color="tertiary" fit style={travelOverlineStyle}>
            Vehicle
          </AppText>
          <AppText variant="callout" fit style={styles.detailValue}>
            {details.vehicleClass}
          </AppText>
        </View>
      ) : null}
      {pickupStamp || details.pickupLocation ? (
        <View style={styles.block}>
          <AppText variant="overline" color="tertiary" fit style={travelOverlineStyle}>
            Pick Up
          </AppText>
          {pickupStamp ? (
            <AppText variant="callout" color="accent" fit>
              {pickupStamp}
            </AppText>
          ) : null}
          {details.pickupLocation ? (
            <AppText variant="caption" color="secondary">
              {details.pickupLocation}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {dropoffStamp || details.dropoffLocation ? (
        <View style={styles.block}>
          <AppText variant="overline" color="tertiary" fit style={travelOverlineStyle}>
            Drop Off
          </AppText>
          {dropoffStamp ? (
            <AppText variant="callout" color="accent" fit>
              {dropoffStamp}
            </AppText>
          ) : null}
          {details.dropoffLocation ? (
            <AppText variant="caption" color="secondary">
              {details.dropoffLocation}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <ConfirmationDocumentCue
        uris={details.confirmationUris}
        kind="rental"
        accessibilityLabel="View uploaded rental confirmation"
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
  block: { gap: spacing.xxs },
  flex: { flex: 1, minWidth: 0, flexShrink: 1, gap: spacing.xxs },
});
