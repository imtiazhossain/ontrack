import { fetchWithTimeout } from '@/services/http/fetch-with-timeout';

/**
 * Hostelworld’s public autocomplete (same endpoint + api-key their web app embeds).
 * City id is required for `/pwa/s` deep links that honor check-in/out dates.
 */
const AUTOCOMPLETE_URL =
  'https://prod.apigee.hostelworld.com/autocomplete-service/v1/autocomplete/web';
/** Public client key from Hostelworld’s Nuxt runtime config. */
const AUTOCOMPLETE_API_KEY = 'TKM51SUbyeCZl8soGScBLR9lYQdjCvTR8cIN4vfqpG6oExKT';
const LOOKUP_TIMEOUT_MS = 8_000;

export type HostelworldCity = {
  id: number;
  city: string;
  country: string;
  label: string;
};

type AutocompleteItem = {
  id?: number;
  name?: string;
  type?: string;
  city?: {
    id?: number;
    name?: string;
    country?: string;
  };
};

const cache = new Map<string, HostelworldCity>();

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

function queryCandidates(query: string): string[] {
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

function splitLabel(label: string): { city: string; country: string } | null {
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return {
    city: parts[0]!,
    country: parts.slice(1).join(', '),
  };
}

export function cityFromAutocompleteResults(
  query: string,
  results: AutocompleteItem[],
): HostelworldCity | null {
  const queryCity = normalized(query.split(',')[0] ?? query);

  const cities = results.filter(
    (item): item is AutocompleteItem & { id: number; name: string } =>
      item.type === 'city' &&
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0,
  );

  const matchedCity =
    cities.find((item) => normalized(item.name.split(',')[0] ?? item.name) === queryCity) ??
    cities.find((item) => {
      const name = normalized(item.name.split(',')[0] ?? item.name);
      return name.startsWith(queryCity) || queryCity.startsWith(name);
    }) ??
    cities[0];

  if (matchedCity) {
    const split = splitLabel(matchedCity.name);
    return {
      id: matchedCity.id,
      city: split?.city ?? matchedCity.name,
      country: split?.country ?? '',
      label: matchedCity.name,
    };
  }

  const property = results.find(
    (item) =>
      item.type === 'property' &&
      typeof item.city?.id === 'number' &&
      typeof item.city.name === 'string' &&
      item.city.name.trim().length > 0,
  );
  if (property?.city && typeof property.city.id === 'number' && property.city.name) {
    const country = property.city.country?.trim() ?? '';
    const city = property.city.name.trim();
    return {
      id: property.city.id,
      city,
      country,
      label: country ? `${city}, ${country}` : city,
    };
  }

  return null;
}

async function fetchAutocomplete(
  text: string,
  signal: AbortSignal,
): Promise<AutocompleteItem[]> {
  const url = `${AUTOCOMPLETE_URL}?${new URLSearchParams({ text }).toString()}`;
  const response = await fetchWithTimeout(
    url,
    {
      signal,
      headers: {
        Accept: 'application/json',
        'api-key': AUTOCOMPLETE_API_KEY,
      },
    },
    LOOKUP_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(`Hostelworld city lookup failed (${response.status}).`);
  }
  const body = await response.json();
  return Array.isArray(body) ? (body as AutocompleteItem[]) : [];
}

export async function resolveHostelworldCity(
  destination: string,
): Promise<HostelworldCity | null> {
  const key = normalized(destination);
  if (!key) return null;
  const cached = cache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  try {
    for (const term of queryCandidates(destination)) {
      const results = await fetchAutocomplete(term, controller.signal);
      const city = cityFromAutocompleteResults(destination, results);
      if (!city) continue;
      cache.set(key, city);
      return city;
    }
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return null;
    return null;
  } finally {
    controller.abort();
  }
}
