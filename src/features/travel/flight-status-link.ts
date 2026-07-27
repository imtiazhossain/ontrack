import type { TravelFlightDetails } from './types';

function cleanSearchTerm(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/\s+/g, ' ');
  return cleaned || undefined;
}

export function googleFlightStatusUrl(
  flight: Pick<TravelFlightDetails, 'airline' | 'flightNumber'> | undefined,
  date?: string,
): string | undefined {
  const flightNumber = cleanSearchTerm(flight?.flightNumber);
  if (!flightNumber) return undefined;

  const query = [
    cleanSearchTerm(flight?.airline),
    flightNumber,
    'flight status',
    cleanSearchTerm(date),
  ]
    .filter(Boolean)
    .join(' ');

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
