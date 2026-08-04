import type { FlightLeg, FlightOffer, FlightSegment } from './types';

interface AmadeusSegment {
  departure?: { iataCode?: string; at?: string };
  arrival?: { iataCode?: string; at?: string };
  carrierCode?: string;
  number?: string;
}

interface AmadeusItinerary {
  duration?: string;
  segments?: AmadeusSegment[];
}

interface AmadeusOffer {
  id?: string;
  price?: { total?: string; currency?: string };
  numberOfBookableSeats?: number;
  itineraries?: AmadeusItinerary[];
}

function normalizeSegment(
  segment: AmadeusSegment,
  carriers: Record<string, string>,
): FlightSegment | undefined {
  if (
    !segment.departure?.iataCode ||
    !segment.departure.at ||
    !segment.arrival?.iataCode ||
    !segment.arrival.at
  ) {
    return undefined;
  }
  const carrierCode = segment.carrierCode ?? '';
  return {
    departureCode: segment.departure.iataCode,
    departureAt: segment.departure.at,
    arrivalCode: segment.arrival.iataCode,
    arrivalAt: segment.arrival.at,
    carrier: carriers[carrierCode] ?? carrierCode,
    flightNumber: `${carrierCode}${segment.number ?? ''}`,
  };
}

function normalizeLeg(
  itinerary: AmadeusItinerary | undefined,
  carriers: Record<string, string>,
): FlightLeg | undefined {
  const rawSegments = itinerary?.segments ?? [];
  const segments = rawSegments.flatMap((segment) => {
    const normalized = normalizeSegment(segment, carriers);
    return normalized ? [normalized] : [];
  });
  if (segments.length === 0 || segments.length !== rawSegments.length) return undefined;
  const first = segments[0];
  const last = segments[segments.length - 1];
  return {
    departureCode: first.departureCode,
    departureAt: first.departureAt,
    arrivalCode: last.arrivalCode,
    arrivalAt: last.arrivalAt,
    duration: itinerary?.duration ?? '',
    stops: Math.max(0, segments.length - 1),
    carrier: first.carrier,
    flightNumber: first.flightNumber,
    segments,
  };
}

export function normalizeFlightOffers(
  data: unknown[],
  carriers: Record<string, string>,
): FlightOffer[] {
  return data.flatMap((raw) => {
    const offer = raw as AmadeusOffer;
    const outbound = normalizeLeg(offer.itineraries?.[0], carriers);
    if (!offer.id || !offer.price?.total || !offer.price.currency || !outbound) return [];
    return [{
      id: offer.id,
      totalPrice: offer.price.total,
      currency: offer.price.currency,
      seatsAvailable: offer.numberOfBookableSeats,
      outbound,
      inbound: normalizeLeg(offer.itineraries?.[1], carriers),
    }];
  });
}
