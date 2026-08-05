import type { TravelExpense, TravelItineraryItem, TravelPlan } from '@/features/travel/types';

type RouteAirports = { origin: string; destination: string };

function airportCode(value?: string): string | undefined {
  const code = value?.trim().toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : undefined;
}

function routeFromAirports(
  departure?: string,
  arrival?: string,
): RouteAirports | undefined {
  const origin = airportCode(departure);
  const destination = airportCode(arrival);
  if (!origin || !destination) return undefined;
  return { origin, destination };
}

function flightRoutesOnItem(item: TravelItineraryItem): RouteAirports[] {
  if (item.kind !== 'flight') return [];
  const routes: RouteAirports[] = [];
  const top = routeFromAirports(
    item.flight?.departureAirport,
    item.flight?.arrivalAirport,
  );
  if (top) routes.push(top);
  const titled = parseFlightRouteTitle(item.title);
  if (
    titled &&
    !routes.some(
      (route) =>
        route.origin === titled.origin && route.destination === titled.destination,
    )
  ) {
    routes.push(titled);
  }
  for (const leg of item.flight?.legs ?? []) {
    const route = routeFromAirports(leg.departureAirport, leg.arrivalAirport);
    if (
      route &&
      !routes.some(
        (entry) =>
          entry.origin === route.origin && entry.destination === route.destination,
      )
    ) {
      routes.push(route);
    }
  }
  return routes;
}

/** Parse "Flight EWR → KEF" / "Flights EWR <-> KEF" style titles. */
export function parseFlightRouteTitle(title: string): RouteAirports | undefined {
  const match = title
    .trim()
    .match(/^Flights?\s+([A-Za-z]{3})\s*(?:→|<->|↔|⇄|->|–|—)\s*([A-Za-z]{3})\b/i);
  if (!match) return undefined;
  return routeFromAirports(match[1], match[2]);
}

export function hasReciprocalFlightRoute(
  items: TravelItineraryItem[],
  route: RouteAirports,
): boolean {
  return items.some((item) =>
    flightRoutesOnItem(item).some(
      (entry) =>
        entry.origin === route.destination && entry.destination === route.origin,
    ),
  );
}

/** True when itinerary has a return (reciprocal airports) or multi-day pair on this route. */
export function hasRoundTripFlightPair(
  items: TravelItineraryItem[],
  route: RouteAirports,
): boolean {
  if (hasReciprocalFlightRoute(items, route)) return true;
  const dates = new Set<string>();
  for (const item of items) {
    if (item.kind !== 'flight' || !item.date) continue;
    const touchesRoute = flightRoutesOnItem(item).some(
      (entry) =>
        (entry.origin === route.origin &&
          entry.destination === route.destination) ||
        (entry.origin === route.destination &&
          entry.destination === route.origin),
    );
    if (touchesRoute) dates.add(item.date);
  }
  return dates.size >= 2;
}

export function roundTripRouteFromSegments(
  segments: Array<{
    flight?: { departureAirport?: string; arrivalAirport?: string };
  }>,
): RouteAirports | undefined {
  if (segments.length < 2) return undefined;
  const outbound = routeFromAirports(
    segments[0]?.flight?.departureAirport,
    segments[0]?.flight?.arrivalAirport,
  );
  if (!outbound) return undefined;
  const hasReturn = segments.some((segment) => {
    const route = routeFromAirports(
      segment.flight?.departureAirport,
      segment.flight?.arrivalAirport,
    );
    return (
      route?.origin === outbound.destination &&
      route.destination === outbound.origin
    );
  });
  return hasReturn ? outbound : undefined;
}

export function formatOneWayFlightTitle(route: RouteAirports): string {
  return `Flight ${route.origin} → ${route.destination}`;
}

export function formatRoundTripFlightTitle(route: RouteAirports): string {
  return `Flights ${route.origin} <-> ${route.destination}`;
}

function isCanonicalRoundTripTitle(title: string): boolean {
  return /^Flights\s+[A-Z]{3}\s*<->\s*[A-Z]{3}$/i.test(title.trim());
}

/** Expense / confirmation title from imported segments (round-trip → plural + <->). */
export function flightExpenseTitleFromSegments(
  segments: Array<{
    flight?: { departureAirport?: string; arrivalAirport?: string };
    title?: string;
  }>,
): string | undefined {
  const roundTrip = roundTripRouteFromSegments(segments);
  if (roundTrip) return formatRoundTripFlightTitle(roundTrip);
  const connected = segments.length > 1 && segments.every((segment, index) => {
    if (index === 0) return true;
    return (
      airportCode(segments[index - 1]?.flight?.arrivalAirport) ===
      airportCode(segment.flight?.departureAirport)
    );
  });
  if (connected) {
    const route = routeFromAirports(
      segments[0]?.flight?.departureAirport,
      segments[segments.length - 1]?.flight?.arrivalAirport,
    );
    if (route) return formatOneWayFlightTitle(route);
  }
  const first = segments[0];
  const oneWay = routeFromAirports(
    first?.flight?.departureAirport,
    first?.flight?.arrivalAirport,
  );
  if (oneWay) return formatOneWayFlightTitle(oneWay);
  const trimmed = first?.title?.trim();
  return trimmed || undefined;
}

export function isRoundTripFlightExpense(
  expense: TravelExpense,
  plan: Pick<TravelPlan, 'itinerary'>,
): boolean {
  if (expense.category !== 'flight') return false;
  const route =
    parseFlightRouteTitle(expense.title) ??
    roundTripRouteFromSegments(
      plan.itinerary.filter((item) => item.kind === 'flight'),
    );
  if (!route) return false;
  if (/\bFlights\b/.test(expense.title) && /(?:<->|↔|⇄)/.test(expense.title)) {
    return true;
  }
  return hasRoundTripFlightPair(plan.itinerary, route);
}

/** List / form title: upgrade one-way wording when the trip has a return leg. */
export function flightExpenseDisplayTitle(
  expense: TravelExpense,
  plan: Pick<TravelPlan, 'itinerary'>,
): string {
  if (expense.category !== 'flight') return expense.title;
  const route = parseFlightRouteTitle(expense.title);
  if (!route) return expense.title;
  if (hasRoundTripFlightPair(plan.itinerary, route)) {
    return formatRoundTripFlightTitle(route);
  }
  // Already round-trip wording (any arrow) → canonicalize to Flights ORIG <-> DEST.
  if (/\bFlights\b/i.test(expense.title) && /(?:<->|↔|⇄)/.test(expense.title)) {
    return formatRoundTripFlightTitle(route);
  }
  if (isCanonicalRoundTripTitle(expense.title)) return expense.title;
  return expense.title;
}

/** Persist round-trip titles on existing flight expenses when itinerary has a return. */
export function withRoundTripFlightExpenseTitles(plan: TravelPlan): TravelPlan {
  let changed = false;
  const expenses = plan.expenses.map((expense) => {
    const title = flightExpenseDisplayTitle(expense, plan);
    if (title === expense.title) return expense;
    changed = true;
    return {
      ...expense,
      title,
      updatedAt: new Date().toISOString(),
    };
  });
  if (!changed) return plan;
  return {
    ...plan,
    expenses,
    updatedAt: new Date().toISOString(),
  };
}
