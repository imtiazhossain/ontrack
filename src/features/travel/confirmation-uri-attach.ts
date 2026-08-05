import { newestStoredConfirmationUris } from './confirmation-attachments';
import { isDuplicateItineraryItem } from './normalize';
import type { TravelItineraryItem, TravelPlan } from './types';

function mergeUriLists(
  current: string[] | undefined,
  incoming: string[] | undefined,
): string[] | undefined {
  const merged = [...(current ?? [])];
  for (const uri of incoming ?? []) {
    if (uri && !merged.includes(uri)) merged.push(uri);
  }
  return merged.length ? merged : undefined;
}

function withConfirmationUris(
  item: TravelItineraryItem,
  uris: string[] | undefined,
): TravelItineraryItem {
  if (!uris?.length) return item;
  if (item.kind === 'flight' && item.flight) {
    return {
      ...item,
      flight: {
        ...item.flight,
        confirmationUris: mergeUriLists(item.flight.confirmationUris, uris),
      },
    };
  }
  if (item.kind === 'rental' && item.rental) {
    return {
      ...item,
      rental: {
        ...item.rental,
        confirmationUris: mergeUriLists(item.rental.confirmationUris, uris),
      },
    };
  }
  if (item.kind === 'stay' && item.stay) {
    return {
      ...item,
      stay: {
        ...item.stay,
        confirmationUris: mergeUriLists(item.stay.confirmationUris, uris),
      },
    };
  }
  if (item.kind === 'transport' && item.transport) {
    return {
      ...item,
      transport: {
        ...item.transport,
        confirmationUris: mergeUriLists(item.transport.confirmationUris, uris),
      },
    };
  }
  return item;
}

/**
 * When Add-to-Timeline hits a duplicate, still attach any newly imported
 * confirmation files onto the existing matching item.
 */
export function mergeDuplicateItemConfirmationUris(
  plan: TravelPlan,
  incoming: TravelItineraryItem,
): TravelPlan | null {
  const incomingUris =
    incoming.flight?.confirmationUris ??
    incoming.rental?.confirmationUris ??
    incoming.stay?.confirmationUris ??
    incoming.transport?.confirmationUris;
  if (!incomingUris?.length) return null;

  let changed = false;
  const itinerary = plan.itinerary.map((existing) => {
    if (!isDuplicateItineraryItem(existing, incoming)) return existing;
    const next = withConfirmationUris(existing, incomingUris);
    if (next !== existing) changed = true;
    return next;
  });
  if (!changed) return null;
  return { ...plan, itinerary, updatedAt: new Date().toISOString() };
}

/**
 * Recover confirmations that were copied to Documents during import but never
 * linked onto the itinerary item (e.g. duplicate-add discard).
 * Only runs when the plan has a single flight with no stored URIs.
 */
export function attachOrphanedFlightConfirmationUris(
  plan: TravelPlan,
): TravelPlan | null {
  const flights = plan.itinerary.filter((item) => item.kind === 'flight');
  if (flights.length !== 1) return null;
  const flight = flights[0]!;
  if (flight.flight?.confirmationUris?.length) return null;

  const uris = newestStoredConfirmationUris('flight', 1);
  if (!uris.length) return null;

  return {
    ...plan,
    itinerary: plan.itinerary.map((item) =>
      item.id === flight.id ? withConfirmationUris(item, uris) : item,
    ),
    updatedAt: new Date().toISOString(),
  };
}
