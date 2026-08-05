import type { TravelFlightDetails, TravelItineraryItem } from '@/features/travel/types';

/** Route label for headers: `GUA → LGA` or `GUA → IAH → LGA` when connecting. */
export function formatFlightRouteLabel(
  flight?: Pick<
    TravelFlightDetails,
    'departureAirport' | 'arrivalAirport' | 'connectionAirport' | 'legs'
  >,
): string | undefined {
  const dep = flight?.departureAirport?.trim().toUpperCase();
  const arr = flight?.arrivalAirport?.trim().toUpperCase();
  if (!dep && !arr) return undefined;

  // Stored legs are the source of truth; `connectionAirport` covers legacy imports.
  const stops = (flight?.legs ?? [])
    .slice(0, -1)
    .map((leg) => leg.arrivalAirport?.trim().toUpperCase())
    .filter((code): code is string => Boolean(code));
  const connection = flight?.connectionAirport?.trim().toUpperCase();
  if (!stops.length && connection) stops.push(connection);

  const route = [dep, ...stops, arr].filter(
    (code, index, all): code is string =>
      Boolean(code) && all.indexOf(code) === index,
  );
  return route.join(' → ') || undefined;
}

/** Timeline / transport card title from structured airports (includes connection). */
export function flightItemDisplayTitle(item: TravelItineraryItem): string {
  if (item.kind !== 'flight') return item.title;
  return formatFlightRouteLabel(item.flight) ?? item.title;
}
