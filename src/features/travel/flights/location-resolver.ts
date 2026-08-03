import { fetch } from 'expo/fetch';

const LOCATION_LOOKUP_TIMEOUT_MS = 8_000;
const MAX_AIRPORTS_PER_CITY = 7;
const cache = new Map<string, string[]>();

interface FlightLocation {
  type?: 'airport' | 'city';
  code?: string;
  name?: string;
  city_code?: string;
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

function validCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

/** City/airport search terms — full entry first, then city before a comma. */
export function locationQueryCandidates(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const candidates: string[] = [];
  const push = (value: string) => {
    const key = normalized(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    candidates.push(value.trim());
  };

  push(trimmed);
  const city = trimmed.split(',')[0]?.trim();
  if (city) push(city);
  return candidates;
}

export function airportCodesForLocation(
  query: string,
  results: FlightLocation[],
): string[] {
  const requestedCode = query.trim().toUpperCase();
  const exactAirport = results.find(
    (item) => item.type === 'airport' && item.code === requestedCode,
  );
  if (exactAirport && validCode(exactAirport.code)) return [exactAirport.code];

  const queryName = normalized(query.split(',')[0] ?? query);
  const city =
    results.find(
      (item) =>
        item.type === 'city' &&
        typeof item.name === 'string' &&
        normalized(item.name) === queryName,
    ) ??
    results.find(
      (item) =>
        item.type === 'city' &&
        typeof item.name === 'string' &&
        (normalized(item.name).startsWith(queryName) ||
          queryName.startsWith(normalized(item.name))),
    ) ??
    results.find((item) => item.type === 'city');
  if (city && validCode(city.code)) {
    const cityAirports = results
      .filter(
        (item): item is FlightLocation & { code: string } =>
          item.type === 'airport' &&
          item.city_code === city.code &&
          validCode(item.code),
      )
      .map((item) => item.code)
      .slice(0, MAX_AIRPORTS_PER_CITY);
    return cityAirports.length > 0 ? cityAirports : [city.code];
  }

  const airport = results.find(
    (item): item is FlightLocation & { code: string } =>
      item.type === 'airport' && validCode(item.code),
  );
  return airport ? [airport.code] : [];
}

async function fetchLocationResults(
  term: string,
  signal: AbortSignal,
): Promise<FlightLocation[]> {
  const params = new URLSearchParams({ term, locale: 'en' });
  params.append('types[]', 'city');
  params.append('types[]', 'airport');
  const response = await fetch(
    `https://autocomplete.travelpayouts.com/places2?${params.toString()}`,
    { signal },
  );
  if (!response.ok) throw new Error(`Location lookup failed (${response.status}).`);
  const body = await response.json();
  return Array.isArray(body) ? (body as FlightLocation[]) : [];
}

export async function resolveFlightLocation(query: string): Promise<string[]> {
  const key = normalized(query);
  const cached = cache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCATION_LOOKUP_TIMEOUT_MS);
  try {
    for (const term of locationQueryCandidates(query)) {
      const results = await fetchLocationResults(term, controller.signal);
      const codes = airportCodesForLocation(query, results);
      if (codes.length === 0) continue;
      cache.set(key, codes);
      cache.set(normalized(term), codes);
      return codes;
    }
    throw new Error(`No airports found for ${query.trim()}.`);
  } finally {
    clearTimeout(timeout);
  }
}
