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
import type { TravelRentalDetails } from './types';

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
  const accent = kindAccent('rental', theme);
  const tint = kindTint('rental', theme);
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
  const rows = [
    pickupStamp || details.pickupLocation
      ? {
          label: 'Pick Up',
          value: pickupStamp,
          detail: details.pickupLocation,
          icon: 'calendar' as const,
        }
      : undefined,
    dropoffStamp || details.dropoffLocation
      ? {
          label: 'Drop Off',
          value: dropoffStamp,
          detail: details.dropoffLocation,
          icon: 'calendar' as const,
        }
      : undefined,
    details.vehicleClass
      ? {
          label: 'Vehicle',
          value: details.vehicleClass,
          icon: 'vehicles' as const,
        }
      : undefined,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <TravelDetailsSummaryCard
      title={details.company || 'Rental'}
      subtitle={details.company ? 'Car Rental' : undefined}
      icon="vehicles"
      accentColor={accent}
      tintColor={tint}
      confirmationCode={details.confirmationCode}
      onPressConfirmation={
        confirmationUris.length ? openConfirmation : undefined
      }
      rows={rows}>
      <ConfirmationDocumentCue
        uris={details.confirmationUris}
        kind="rental"
        accentColor={accent}
        accessibilityLabel="View uploaded rental confirmation"
      />
    </TravelDetailsSummaryCard>
  );
}
