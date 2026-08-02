import type { ParsedRentalConfirmation } from './rental-confirmation-parser';
import { normalizeRentalDetails } from './rental-details';
import type { TravelItineraryItem, TravelPlan, TravelRentalDetails } from './types';

interface MergeImportedRentalOptions {
  itinerary: TravelItineraryItem[];
  parsed: ParsedRentalConfirmation;
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>;
  createId: () => string;
  targetItemId?: string;
  confirmationUris?: string[];
}

export function expandedTripRangeForRental(
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
  parsed: ParsedRentalConfirmation,
): Pick<TravelPlan, 'startDate' | 'endDate'> {
  const dates = [parsed.date, parsed.rental.dropoffDate].filter(
    (date): date is string => Boolean(date),
  );
  return {
    startDate: dates.reduce(
      (earliest, date) => (date < earliest ? date : earliest),
      tripRange.startDate,
    ),
    endDate: dates.reduce(
      (latest, date) => (date > latest ? date : latest),
      tripRange.endDate,
    ),
  };
}

function sameRental(
  item: TravelItineraryItem,
  rental: TravelRentalDetails,
  date: string,
): boolean {
  if (item.kind !== 'rental') return false;
  const code = rental.confirmationCode?.trim().toUpperCase();
  if (code && item.rental?.confirmationCode?.trim().toUpperCase() === code) {
    return true;
  }
  return Boolean(
    rental.company &&
      item.date === date &&
      item.rental?.company?.toLowerCase() === rental.company.toLowerCase(),
  );
}

function importedRentalValues(
  parsed: ParsedRentalConfirmation,
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
  confirmationUris?: string[],
) {
  const rental = {
    ...(normalizeRentalDetails(parsed.rental) ?? {}),
    ...(confirmationUris?.length ? { confirmationUris } : {}),
  };
  const date = parsed.date ?? tripRange.startDate;
  return {
    title:
      parsed.title ||
      (rental.company ? `${rental.company} Rental` : 'Car Rental'),
    date,
    startMinutes: parsed.startMinutes ?? 10 * 60,
    durationMinutes: parsed.durationMinutes ?? 60,
    rental,
  };
}

export function mergeImportedRental({
  itinerary,
  parsed,
  tripRange,
  createId,
  targetItemId,
  confirmationUris,
}: MergeImportedRentalOptions): TravelItineraryItem[] {
  const values = importedRentalValues(parsed, tripRange, confirmationUris);
  const merged = [...itinerary];
  const targetIndex = targetItemId
    ? merged.findIndex((item) => item.id === targetItemId)
    : merged.findIndex((item) => sameRental(item, values.rental, values.date));

  if (targetIndex >= 0) {
    merged[targetIndex] = {
      ...merged[targetIndex],
      kind: 'rental',
      ...values,
      rental: {
        ...merged[targetIndex].rental,
        ...values.rental,
      },
    };
    return merged;
  }

  return [
    ...merged,
    {
      id: createId(),
      kind: 'rental',
      ...values,
    },
  ];
}
