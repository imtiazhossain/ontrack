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

function referencedConfirmationUris(plans: TravelPlan[]): Set<string> {
  const referenced = new Set<string>();
  for (const plan of plans) {
    for (const item of plan.itinerary) {
      const uris =
        item.flight?.confirmationUris ??
        item.rental?.confirmationUris ??
        item.stay?.confirmationUris ??
        item.transport?.confirmationUris;
      for (const uri of uris ?? []) referenced.add(uri);
    }
  }
  return referenced;
}

function pickOrphanConfirmationUri(
  orphans: string[],
  confirmationCode?: string,
): string | undefined {
  if (!orphans.length) return undefined;
  const code = confirmationCode?.trim().toUpperCase();
  if (code) {
    const named = orphans.find((uri) => uri.toUpperCase().includes(code));
    if (named) return named;
  }
  return orphans[0];
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
 * linked onto the itinerary item (e.g. duplicate-add discard, invite copy).
 *
 * - Prefers files whose name embeds the confirmation code.
 * - Single flight without URIs: newest unreferenced orphan.
 * - Multiple flights: only when they share one non-empty confirmation code, and
 *   a code-named orphan exists (avoids attaching another trip's file).
 */
export function attachOrphanedFlightConfirmationUris(
  plan: TravelPlan,
  options?: { allPlans?: TravelPlan[] },
): TravelPlan | null {
  const needing = plan.itinerary.filter(
    (item) =>
      item.kind === 'flight' &&
      item.flight &&
      !item.flight.confirmationUris?.length,
  );
  if (!needing.length) return null;

  const referenced = referencedConfirmationUris(options?.allPlans ?? [plan]);
  const orphans = newestStoredConfirmationUris('flight', 40).filter(
    (uri) => !referenced.has(uri),
  );
  if (!orphans.length) return null;

  if (needing.length === 1) {
    const flight = needing[0]!;
    const uri = pickOrphanConfirmationUri(
      orphans,
      flight.flight?.confirmationCode,
    );
    if (!uri) return null;
    return {
      ...plan,
      itinerary: plan.itinerary.map((item) =>
        item.id === flight.id ? withConfirmationUris(item, [uri]) : item,
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  const codes = new Set(
    needing.map(
      (item) => item.flight?.confirmationCode?.trim().toUpperCase() || '',
    ),
  );
  if (codes.size !== 1) return null;
  const code = [...codes][0];
  if (!code) return null;

  // Round-trips share one PNR — only auto-link when the file name includes it.
  const named = orphans.find((uri) => uri.toUpperCase().includes(code));
  if (!named) return null;

  const targetIds = new Set(needing.map((item) => item.id));
  return {
    ...plan,
    itinerary: plan.itinerary.map((item) =>
      targetIds.has(item.id) ? withConfirmationUris(item, [named]) : item,
    ),
    updatedAt: new Date().toISOString(),
  };
}
