import type { ParsedFlightSegment } from './flight-confirmation-parser';
import type { TravelItineraryItem, TravelPlan } from './types';

interface MergeImportedFlightsOptions {
  itinerary: TravelItineraryItem[];
  segments: ParsedFlightSegment[];
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>;
  createId: () => string;
  targetItemId?: string;
}

function sameFlight(
  item: TravelItineraryItem,
  segment: ParsedFlightSegment,
  date: string,
): boolean {
  if (item.kind !== 'flight') return false;
  const flightNumber = segment.flight.flightNumber.trim().toUpperCase();
  if (
    flightNumber &&
    item.flight?.flightNumber?.trim().toUpperCase() === flightNumber
  ) {
    return true;
  }
  return Boolean(
    segment.flight.departureAirport &&
      segment.flight.arrivalAirport &&
      item.date === date &&
      item.flight?.departureAirport?.toUpperCase() ===
        segment.flight.departureAirport.toUpperCase() &&
      item.flight?.arrivalAirport?.toUpperCase() ===
        segment.flight.arrivalAirport.toUpperCase(),
  );
}

function importedItemValues(
  segment: ParsedFlightSegment,
  index: number,
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
) {
  const date =
    segment.date ??
    (index === 0 ? tripRange.startDate : tripRange.endDate);
  return {
    title:
      segment.title ||
      segment.flight.flightNumber ||
      (index === 0 ? 'Departure flight' : 'Return flight'),
    date,
    startMinutes: segment.startMinutes ?? 12 * 60,
    ...(segment.durationMinutes !== undefined
      ? { durationMinutes: segment.durationMinutes }
      : {}),
    flight: {
      airline: segment.flight.airline || undefined,
      flightNumber: segment.flight.flightNumber || undefined,
      confirmationCode: segment.flight.confirmationCode || undefined,
      departureAirport: segment.flight.departureAirport || undefined,
      arrivalAirport: segment.flight.arrivalAirport || undefined,
      seat: segment.flight.seat || undefined,
    },
  };
}

export function mergeImportedFlights({
  itinerary,
  segments,
  tripRange,
  createId,
  targetItemId,
}: MergeImportedFlightsOptions): TravelItineraryItem[] {
  const merged = [...itinerary];

  segments.forEach((segment, index) => {
    const values = importedItemValues(segment, index, tripRange);
    const targetIndex =
      index === 0 && targetItemId
        ? merged.findIndex((item) => item.id === targetItemId)
        : merged.findIndex(
            (item) =>
              item.id !== targetItemId && sameFlight(item, segment, values.date),
          );
    if (targetIndex >= 0) {
      merged[targetIndex] = {
        ...merged[targetIndex],
        kind: 'flight',
        ...values,
        flight: {
          ...merged[targetIndex].flight,
          ...values.flight,
        },
      };
      return;
    }
    merged.push({
      id: createId(),
      kind: 'flight',
      durationMinutes: 60,
      ...values,
    });
  });

  return merged;
}
