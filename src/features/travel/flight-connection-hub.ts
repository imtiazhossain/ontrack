import { airportCodeForCityName } from './airport-catalog';
import { normalizeAirportCode } from './airport-timezones';
import type { ParsedFlightSegment } from './flight-confirmation-parser';

/** "1h 39m layover in Houston" → Houston */
const LAYOVER_CITY =
  /\blayover\s+in\s+([A-Za-z][A-Za-z .'-]{1,40}?)(?:\s*[,.]|\s*$|\s*\()/gim;

export function findLayoverCityAirportCode(text: string): string | undefined {
  for (const match of text.matchAll(LAYOVER_CITY)) {
    const code = airportCodeForCityName(match[1] ?? '');
    if (code) return code;
  }
  return undefined;
}

/**
 * Hub where a connecting itinerary changes planes.
 * Prefer the shared airport between leg 1 arrival and leg 2 departure.
 * When OCR disagrees (e.g. first arrival wrongly equals the final destination),
 * prefer the second leg's departure, then a "layover in {city}" clue.
 */
export function resolveConnectingHub(
  segments: ParsedFlightSegment[],
  sourceText = '',
): string | undefined {
  if (segments.length < 2) return undefined;
  const firstArrival = normalizeAirportCode(segments[0]?.flight.arrivalAirport);
  const secondDeparture = normalizeAirportCode(
    segments[1]?.flight.departureAirport,
  );
  const origin = normalizeAirportCode(segments[0]?.flight.departureAirport);
  const finalArrival = normalizeAirportCode(
    segments.at(-1)?.flight.arrivalAirport,
  );
  const layoverCity = findLayoverCityAirportCode(sourceText);

  const usable = (code?: string) =>
    Boolean(code && code !== finalArrival && code !== origin);

  if (firstArrival && secondDeparture && firstArrival === secondDeparture) {
    if (usable(firstArrival)) return firstArrival;
  }

  // OCR often keeps the summary destination on leg 1 arrival while leg 2 still
  // departs the real hub — prefer the continue-from airport.
  if (usable(secondDeparture)) return secondDeparture;
  if (usable(layoverCity)) return layoverCity;
  if (usable(firstArrival)) return firstArrival;

  return undefined;
}

/**
 * Repair connecting segments after OCR so layover + connection airport agree.
 * Clears layover minutes when no hub distinct from origin/destination exists.
 */
export function repairConnectingSegments(
  segments: ParsedFlightSegment[],
  sourceText = '',
): ParsedFlightSegment[] {
  if (segments.length < 2) return segments;
  const hub = resolveConnectingHub(segments, sourceText);
  const first = segments[0]!;
  const second = segments[1]!;

  if (!hub) {
    if (!first.layoverMinutesAfter) return segments;
    const { layoverMinutesAfter: _drop, ...rest } = first;
    return [{ ...rest }, ...segments.slice(1)];
  }

  const nextFirst: ParsedFlightSegment = {
    ...first,
    title:
      first.flight.departureAirport && hub
        ? `Flight ${first.flight.departureAirport} → ${hub}`
        : first.title,
    flight: {
      ...first.flight,
      arrivalAirport: hub,
      connectionAirport: hub,
    },
  };
  const nextSecond: ParsedFlightSegment = {
    ...second,
    title:
      hub && second.flight.arrivalAirport
        ? `Flight ${hub} → ${second.flight.arrivalAirport}`
        : second.title,
    flight: {
      ...second.flight,
      departureAirport: hub,
    },
  };

  return [nextFirst, nextSecond, ...segments.slice(2)];
}
