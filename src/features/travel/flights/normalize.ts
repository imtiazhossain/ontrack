import type { FlightLeg, FlightOffer } from './types';

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

function normalizeLeg(
  itinerary: AmadeusItinerary | undefined,
  carriers: Record<string, string>,
): FlightLeg | undefined {
  const segments = itinerary?.segments;
  const first = segments?.[0];
  const last = segments?.[segments.length - 1];
  if (
    !first?.departure?.iataCode ||
    !first.departure.at ||
    !last?.arrival?.iataCode ||
    !last.arrival.at
  ) {
    return undefined;
  }
  const carrierCode = first.carrierCode ?? '';
  return {
    departureCode: first.departure.iataCode,
    departureAt: first.departure.at,
    arrivalCode: last.arrival.iataCode,
    arrivalAt: last.arrival.at,
    duration: itinerary?.duration ?? '',
    stops: Math.max(0, (segments?.length ?? 1) - 1),
    carrier: carriers[carrierCode] ?? carrierCode,
    flightNumber: `${carrierCode}${first.number ?? ''}`,
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
