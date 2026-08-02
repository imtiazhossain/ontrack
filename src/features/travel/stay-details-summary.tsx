import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDateKeyShort,
  formatMinutes,
  type DateDisplayFormat,
} from '@/utils/date';

import {
  confirmationUrisForDisplay,
  openConfirmationAttachments,
} from './confirmation-attachments';
import { ConfirmationDocumentCue } from './confirmation-document-cue';
import { travelOverlineStyle } from './travel-chrome';
import type { TravelStayDetails } from './types';

function formatStamp(
  date: string | undefined,
  minutes: number | undefined,
  dateDisplayFormat: DateDisplayFormat,
): string | undefined {
  const parts = [
    date ? formatDateKeyShort(date, dateDisplayFormat) : undefined,
    minutes !== undefined ? formatMinutes(minutes) : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export function StayDetailsSummary({
  details,
  checkinDate,
  checkinMinutes,
  dateDisplayFormat = 'mdy',
}: {
  details: TravelStayDetails;
  checkinDate?: string;
  checkinMinutes?: number;
  dateDisplayFormat?: DateDisplayFormat;
}) {
  const theme = useTheme();
  const checkinStamp = formatStamp(checkinDate, checkinMinutes, dateDisplayFormat);
  const checkoutStamp = formatStamp(
    details.checkoutDate,
    details.checkoutMinutes,
    dateDisplayFormat,
  );
  const confirmationUris = confirmationUrisForDisplay(
    details.confirmationUris,
    'stay',
  );
  const openConfirmation = () => {
    if (!confirmationUris.length) return;
    void openConfirmationAttachments(confirmationUris);
  };

  const hasBody =
    Boolean(details.confirmationCode) ||
    Boolean(details.reservationEmail) ||
    Boolean(details.notes) ||
    Boolean(checkinStamp) ||
    Boolean(checkoutStamp) ||
    confirmationUris.length > 0;
  if (!hasBody) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.accentFaint }]}>
      <View style={styles.header}>
        <Symbol name="lodging" size="sm" color={theme.textPrimary} />
        <View style={styles.flex}>
          <AppText variant="subheading" color="primary" fit>
            Stay
          </AppText>
        </View>
      </View>
      {details.confirmationCode ? (
        <Pressable
          accessibilityRole={confirmationUris.length ? 'button' : undefined}
          accessibilityLabel={
            confirmationUris.length
              ? 'View uploaded stay confirmation'
              : undefined
          }
          disabled={!confirmationUris.length}
          onPress={openConfirmation}
          style={styles.detailRow}>
          <AppText variant="overline" color="secondary" fit style={travelOverlineStyle}>
            Confirmation
          </AppText>
          <AppText
            variant="callout"
            color="primary"
            selectable
            fit
            style={styles.detailValue}>
            {details.confirmationCode}
          </AppText>
        </Pressable>
      ) : null}
      {details.reservationEmail ? (
        <View style={styles.detailRow}>
          <AppText variant="overline" color="secondary" fit style={travelOverlineStyle}>
            Email
          </AppText>
          <AppText
            variant="callout"
            color="primary"
            selectable
            fit
            style={styles.detailValue}>
            {details.reservationEmail}
          </AppText>
        </View>
      ) : null}
      {checkinStamp ? (
        <View style={styles.block}>
          <AppText variant="overline" color="secondary" fit style={travelOverlineStyle}>
            Check In
          </AppText>
          <AppText variant="callout" color="primary" fit>
            {checkinStamp}
          </AppText>
        </View>
      ) : null}
      {checkoutStamp ? (
        <View style={styles.block}>
          <AppText variant="overline" color="secondary" fit style={travelOverlineStyle}>
            Check Out
          </AppText>
          <AppText variant="callout" color="primary" fit>
            {checkoutStamp}
          </AppText>
        </View>
      ) : null}
      {details.notes ? (
        <View style={styles.block}>
          <AppText variant="overline" color="secondary" fit style={travelOverlineStyle}>
            Notes
          </AppText>
          <AppText variant="callout" color="primary" selectable>
            {details.notes}
          </AppText>
        </View>
      ) : null}
      <ConfirmationDocumentCue
        uris={details.confirmationUris}
        kind="stay"
        accessibilityLabel="View uploaded stay confirmation"
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
