import { calculateFlightArrival } from '@/features/travel/flight-arrival';
import {
  formatDateKeyShort,
  formatMinutes,
  type DateDisplayFormat,
} from '@/utils/date';

import {
  openConfirmationAttachments,
  confirmationUrisForDisplay,
} from './confirmation-attachments';
import { ConfirmationDocumentCue } from './confirmation-document-cue';
import { TravelDetailsSummaryCard } from './travel-details-summary-card';
import type { TravelFlightDetails } from './types';

const FLIGHT_ACCENT = '#A9782C';
const FLIGHT_TINT = '#F5EAD8';

export function FlightDetailsSummary({
  details,
  date,
  startMinutes,
  durationMinutes,
  dateDisplayFormat = 'mdy',
}: {
  details: TravelFlightDetails;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
  dateDisplayFormat?: DateDisplayFormat;
}) {
  const route = [details.departureAirport, details.arrivalAirport]
    .filter(Boolean)
    .join(' → ');
  const carrier = [details.airline, details.flightNumber]
    .filter(Boolean)
    .join(' · ');
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
  const departureStamp =
    date && startMinutes !== undefined
      ? `${formatDateKeyShort(date, dateDisplayFormat)} · ${formatMinutes(startMinutes)}`
      : undefined;
  const arrivalStamp = arrival
    ? `${formatDateKeyShort(arrival.date, dateDisplayFormat)} · ${formatMinutes(arrival.startMinutes)}`
    : undefined;
  const rows = [
    departureStamp || details.departureAirport
      ? {
          label: 'Departure',
          value: departureStamp,
          detail: details.departureAirport,
          icon: 'flight' as const,
        }
      : undefined,
    arrivalStamp || details.arrivalAirport
      ? {
          label: 'Arrival',
          value: arrivalStamp,
          detail: [
            details.arrivalAirport,
            arrival?.timeZoneAware ? 'Local time' : undefined,
          ]
            .filter(Boolean)
            .join(' · '),
          icon: 'flight' as const,
        }
      : undefined,
    details.seat
      ? { label: 'Seat', value: details.seat, icon: 'personal' as const }
      : undefined,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <TravelDetailsSummaryCard
      title="Flight"
      subtitle={carrier || route || undefined}
      icon="flight"
      accentColor={FLIGHT_ACCENT}
      tintColor={FLIGHT_TINT}
      confirmationCode={details.confirmationCode}
      onPressConfirmation={
        confirmationUris.length ? openConfirmation : undefined
      }
      rows={rows}>
      <ConfirmationDocumentCue
        uris={details.confirmationUris}
        kind="flight"
        accentColor={FLIGHT_ACCENT}
        accessibilityLabel="View uploaded flight confirmation"
      />
    </TravelDetailsSummaryCard>
  );
}
