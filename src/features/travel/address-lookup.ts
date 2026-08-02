import { fetch } from 'expo/fetch';

const LOOKUP_TIMEOUT_MS = 8_000;
const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 6;

export interface AddressSuggestion {
  id: string;
  label: string;
  secondary?: string;
}

interface PhotonProperties {
  osm_id?: unknown;
  osm_type?: unknown;
  name?: unknown;
  housenumber?: unknown;
  street?: unknown;
  postcode?: unknown;
  city?: unknown;
  town?: unknown;
  village?: unknown;
  locality?: unknown;
  district?: unknown;
  county?: unknown;
  state?: unknown;
  country?: unknown;
  type?: unknown;
}

interface PhotonFeature {
  properties?: PhotonProperties;
}

interface PhotonResponse {
  features?: unknown;
}

function asTrimmed(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function uniqueParts(parts: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const key = part.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(part);
  }
  return result;
}

/** Build a readable street-first label from Photon properties. */
export function formatAddressSuggestion(properties: PhotonProperties): AddressSuggestion | undefined {
  const name = asTrimmed(properties.name);
  const housenumber = asTrimmed(properties.housenumber);
  const street = asTrimmed(properties.street);
  const postcode = asTrimmed(properties.postcode);
  const city =
    asTrimmed(properties.city) ??
    asTrimmed(properties.town) ??
    asTrimmed(properties.village) ??
    asTrimmed(properties.locality) ??
    asTrimmed(properties.district);
  const state = asTrimmed(properties.state) ?? asTrimmed(properties.county);
  const country = asTrimmed(properties.country);

  const streetLine =
    housenumber && street
      ? `${housenumber} ${street}`
      : street ?? housenumber;

  const localityLine = uniqueParts([postcode, city, state, country]).join(', ');

  // Prefer "Venue, 12 Street" when both exist; otherwise street or place name.
  const primaryParts = uniqueParts([
    name && streetLine && name.toLocaleLowerCase() !== streetLine.toLocaleLowerCase()
      ? name
      : undefined,
    streetLine || name,
  ]);
  const primary = primaryParts.join(', ') || localityLine;
  if (!primary) return undefined;

  const secondary =
    localityLine && localityLine.toLocaleLowerCase() !== primary.toLocaleLowerCase()
      ? localityLine
      : undefined;

  const osmType = asTrimmed(properties.osm_type) ?? 'place';
  const osmId = typeof properties.osm_id === 'number' ? String(properties.osm_id) : primary;

  return {
    id: `${osmType}:${osmId}:${primary}`,
    label: primary,
    ...(secondary ? { secondary } : {}),
  };
}

export function normalizeAddressSuggestions(body: unknown): AddressSuggestion[] {
  if (!body || typeof body !== 'object') return [];
  const features = (body as PhotonResponse).features;
  if (!Array.isArray(features)) return [];

  const seen = new Set<string>();
  const results: AddressSuggestion[] = [];
  for (const feature of features) {
    if (!feature || typeof feature !== 'object') continue;
    const suggestion = formatAddressSuggestion(
      ((feature as PhotonFeature).properties ?? {}) as PhotonProperties,
    );
    if (!suggestion) continue;
    const key = `${suggestion.label}|${suggestion.secondary ?? ''}`.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(suggestion);
    if (results.length >= MAX_RESULTS) break;
  }
  return results;
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('limit', String(MAX_RESULTS));
  url.searchParams.set('lang', 'en');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    return normalizeAddressSuggestions(await response.json());
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export const ADDRESS_LOOKUP_MIN_QUERY = MIN_QUERY_LENGTH;
