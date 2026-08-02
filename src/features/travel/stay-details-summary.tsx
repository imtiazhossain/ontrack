import { kindAccent, kindTint } from '@/features/travel/travel-kind-chrome';
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
import { TravelDetailsSummaryCard } from './travel-details-summary-card';
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
  const accent = kindAccent('stay', theme);
  const tint = kindTint('stay', theme);
  const checkinStamp = formatStamp(
    checkinDate,
    checkinMinutes,
    dateDisplayFormat,
  );
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

  const rows = [
    checkinStamp
      ? { label: 'Check In', value: checkinStamp, icon: 'calendar' as const }
      : undefined,
    checkoutStamp
      ? { label: 'Check Out', value: checkoutStamp, icon: 'calendar' as const }
      : undefined,
    details.reservationEmail
      ? {
          label: 'Reservation Email',
          value: details.reservationEmail,
          icon: 'personal' as const,
        }
      : undefined,
    details.notes
      ? { label: 'Notes', detail: details.notes, icon: 'note' as const }
      : undefined,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <TravelDetailsSummaryCard
      title="Stay"
      icon="lodging"
      accentColor={accent}
      tintColor={tint}
      confirmationCode={details.confirmationCode}
      onPressConfirmation={
        confirmationUris.length ? openConfirmation : undefined
      }
      rows={rows}>
      <ConfirmationDocumentCue
        uris={details.confirmationUris}
        kind="stay"
        accentColor={accent}
        accessibilityLabel="View uploaded stay confirmation"
      />
    </TravelDetailsSummaryCard>
  );
}
