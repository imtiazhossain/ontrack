import {
    DESTINATION_COVER_MAX,
    isAllowedDestinationCoverImageUrl,
    isDirectClientCoverUrl,
    isUsableDestinationPhotoUrl,
    lookupDestinationCoverUrls,
} from '@/features/travel/destination-cover-lookup';
import {
    persistTravelMomentPhotos,
    resolveTravelPhotoUris,
} from '@/features/travel/travel-moment-media';
import type { TravelPlan } from '@/features/travel/types';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import { fetchWithTimeout } from '@/services/http/fetch-with-timeout';

const COVER_FETCH_TIMEOUT_MS = 8_000;
/** Brief negative cache so timeouts/offline blips can retry without hammering. */
const COVER_MISS_TTL_MS = 60_000;
type CoverCacheEntry =
  | { kind: 'hit'; uri: string }
  | { kind: 'miss'; expiresAt: number };
type HeroCacheEntry =
  | { kind: 'hit'; uris: string[] }
  | { kind: 'miss'; expiresAt: number };
const coverCache = new Map<string, CoverCacheEntry>();
const heroCache = new Map<string, HeroCacheEntry>();
const inflight = new Map<string, Promise<string | undefined>>();
const heroInflight = new Map<string, Promise<string[]>>();

export {
    DESTINATION_COVER_MAX,
    enlargeWikimediaThumb,
    isAllowedDestinationCoverImageUrl,
    isDirectClientCoverUrl,
    isUsableDestinationPhotoUrl,
    mergeDestinationCoverUrls,
} from '@/features/travel/destination-cover-lookup';

/**
 * Custom cover, else first photo on a moment stop.
 * Flight/stay confirmation screenshots must not become the trip hero.
 */
export function localTripCoverUri(plan: TravelPlan): string | undefined {
  if (plan.coverUri) {
    const custom = resolveTravelPhotoUris([plan.coverUri])[0];
    if (custom) return custom;
  }
  for (const item of plan.itinerary ?? []) {
    if (item.kind !== 'moment') continue;
    const photos = resolveTravelPhotoUris(item.photoUris);
    if (photos[0]) return photos[0];
  }
  return undefined;
}

/** Persist a picked cover into durable documents storage. */
export async function persistTravelCoverPhoto(
  uri: string,
  planId: string,
): Promise<string> {
  const [next] = await persistTravelMomentPhotos([uri], `cover-${planId}`);
  if (!next) throw new Error('Could not save trip cover photo.');
  return next;
}

/**
 * Place names to try for a cover, most specific first.
 * "Reykjavík, Iceland" → Reykjavík, full string, Iceland, then trip title.
 */
export function destinationCoverCandidates(plan: TravelPlan): string[] {
  const out: string[] = [];
  const add = (value: string | undefined) => {
    const next = value?.trim();
    if (!next) return;
    if (out.some((existing) => existing.toLowerCase() === next.toLowerCase())) {
      return;
    }
    out.push(next);
  };

  const destination = plan.destination.trim();
  if (destination) {
    const parts = destination
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      add(parts[0]);
      add(destination);
      for (const part of parts.slice(1)) add(part);
    } else {
      add(destination);
    }
  }
  add(plan.title.trim());
  return out;
}

function coverApiUrl(place: string, limit = 1): string | undefined {
  try {
    const params = new URLSearchParams({ q: place });
    if (limit > 1) params.set('limit', String(limit));
    return resolveExpoApiUrl(`/api/destination-cover?${params.toString()}`, {
      configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      createNotConfiguredError: () => new Error('missing'),
    });
  } catch {
    return undefined;
  }
}

function isLocalTravelPhotoUri(uri: string): boolean {
  const lower = uri.trim().toLowerCase();
  return (
    lower.startsWith('file:') ||
    lower.startsWith('content:') ||
    lower.startsWith('ph://') ||
    lower.startsWith('assets-library:')
  );
}

/** Drop tracking query noise that can break native image loaders. */
function normalizeCoverUri(uri: string): string {
  const trimmed = uri.trim();
  if (isLocalTravelPhotoUri(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname.endsWith('wikimedia.org') ||
      parsed.hostname.endsWith('wikipedia.org')
    ) {
      parsed.search = '';
      return parsed.toString();
    }
  } catch {
    // Keep original when URL parsing fails.
  }
  return trimmed;
}

/**
 * RN Image cannot send Wikimedia's required User-Agent, so route remote covers
 * through the Expo API proxy. Cache still stores the raw upstream HTTPS URL.
 */
export function proxyDestinationCoverImageUrl(
  remoteUri: string,
): string | undefined {
  const normalized = normalizeCoverUri(remoteUri);
  if (!isAllowedDestinationCoverImageUrl(normalized)) return undefined;
  try {
    return resolveExpoApiUrl(
      `/api/destination-cover-image?src=${encodeURIComponent(normalized)}`,
      {
        configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
        createNotConfiguredError: () => new Error('missing'),
      },
    );
  } catch {
    return undefined;
  }
}

function toClientDisplayCoverUri(uri: string): string {
  if (isLocalTravelPhotoUri(uri)) return uri;
  // Unsplash / Flickr / WP can load in RN without a User-Agent proxy.
  if (isDirectClientCoverUrl(uri)) return uri;
  return proxyDestinationCoverImageUrl(uri) ?? uri;
}

/** Prefer direct-loadable remotes so cards survive a missing image proxy. */
function orderHeroUrisForClient(uris: string[]): string[] {
  const direct: string[] = [];
  const proxied: string[] = [];
  for (const uri of uris) {
    if (isLocalTravelPhotoUri(uri) || isDirectClientCoverUrl(uri)) {
      direct.push(uri);
    } else {
      proxied.push(uri);
    }
  }
  return [...direct, ...proxied];
}

function pushUniqueUri(out: string[], uri: string | undefined): void {
  const trimmed = uri?.trim();
  if (!trimmed) return;
  // Local custom/moment covers are file URIs; remotes must stay https-only.
  if (!isLocalTravelPhotoUri(trimmed) && !isUsableDestinationPhotoUrl(trimmed)) {
    return;
  }
  const normalized = normalizeCoverUri(trimmed);
  const key = normalized.toLowerCase();
  if (out.some((existing) => existing.toLowerCase() === key)) return;
  out.push(normalized);
}

/** Prefer Expo API (server User-Agent) then direct Openverse fallback. */
async function resolveRemoteCover(place: string): Promise<string | undefined> {
  const urls = await resolveRemoteCovers(place, 1);
  return urls[0];
}

async function resolveRemoteCovers(
  place: string,
  limit: number,
): Promise<string[]> {
  const capped = Math.max(1, Math.min(DESTINATION_COVER_MAX, limit));
  const apiUrl = coverApiUrl(place, capped);
  if (apiUrl) {
    try {
      const response = await fetchWithTimeout(
        apiUrl,
        { headers: { Accept: 'application/json' } },
        COVER_FETCH_TIMEOUT_MS,
      );
      if (response.ok) {
        const body = (await response.json()) as {
          uri?: string;
          uris?: string[];
        };
        const out: string[] = [];
        for (const candidate of body.uris ?? []) {
          pushUniqueUri(out, candidate?.trim());
          if (out.length >= capped) return out;
        }
        pushUniqueUri(out, body.uri?.trim());
        if (out.length > 0) return out.slice(0, capped);
      }
    } catch {
      // Fall through to direct lookup.
    }
  }

  try {
    return await Promise.race([
      lookupDestinationCoverUrls(place, { limit: capped }),
      new Promise<string[]>((resolve) => {
        setTimeout(() => resolve([]), COVER_FETCH_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return [];
  }
}

/**
 * Place-name candidates for a stay thumbnail: hotel title first, then address
 * parts (skip generic titles like "Demo Stay" / "Stay").
 */
export function stayCoverCandidates(
  title?: string,
  address?: string,
): string[] {
  const out: string[] = [];
  const add = (value: string | undefined) => {
    const next = value?.trim();
    if (!next || next.length < 2) return;
    if (out.some((existing) => existing.toLowerCase() === next.toLowerCase())) {
      return;
    }
    out.push(next);
  };

  const name = title?.trim();
  if (name && !/^(demo\s+)?stay$/i.test(name)) {
    add(name);
  }

  const location = address?.trim();
  if (location) {
    const parts = location
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    // Prefer city/region chunks — skip street lines that include house numbers.
    for (const part of parts) {
      if (!/\d/.test(part)) add(part);
    }
    add(location);
  }

  return out;
}

/** Resolve a remote place photo URL from ordered query candidates (cached). */
export async function fetchPlaceCoverUri(
  candidates: string[],
): Promise<string | undefined> {
  const places = candidates.map((c) => c.trim()).filter((c) => c.length >= 2);
  if (!places.length) return undefined;

  const key = `place-v3|${places.join('|').toLowerCase()}`;
  const cached = coverCache.get(key);
  if (cached?.kind === 'hit') return toClientDisplayCoverUri(cached.uri);
  if (cached?.kind === 'miss') {
    if (cached.expiresAt > Date.now()) return undefined;
    coverCache.delete(key);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      for (const place of places) {
        const next = await resolveRemoteCover(place);
        if (next) {
          coverCache.set(key, { kind: 'hit', uri: next });
          return toClientDisplayCoverUri(next);
        }
      }
      coverCache.set(key, {
        kind: 'miss',
        expiresAt: Date.now() + COVER_MISS_TTL_MS,
      });
      return undefined;
    } catch {
      return undefined;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

/** Resolve a remote destination cover URL (cached per destination query). */
export async function fetchDestinationCoverUri(
  plan: TravelPlan,
): Promise<string | undefined> {
  const local = localTripCoverUri(plan);
  if (local) return local;

  return fetchPlaceCoverUri(destinationCoverCandidates(plan));
}

/**
 * Up to 3 hero images for a trip card carousel.
 * Local custom/moment cover stays first when present; remote fills the rest.
 */
export async function fetchDestinationHeroUris(
  plan: TravelPlan,
  limit: number = DESTINATION_COVER_MAX,
): Promise<string[]> {
  const capped = Math.max(1, Math.min(DESTINATION_COVER_MAX, limit));
  const local = localTripCoverUri(plan);
  const out: string[] = [];
  pushUniqueUri(out, local);
  if (out.length >= capped) return out.map(toClientDisplayCoverUri);

  const places = destinationCoverCandidates(plan)
    .map((c) => c.trim())
    .filter((c) => c.length >= 2);
  if (!places.length) return out.map(toClientDisplayCoverUri);

  const key = `hero-v6|${places.join('|').toLowerCase()}`;
  const cached = heroCache.get(key);
  if (cached?.kind === 'hit') {
    for (const uri of cached.uris) {
      pushUniqueUri(out, uri);
      if (out.length >= capped) break;
    }
    return orderHeroUrisForClient(out).map(toClientDisplayCoverUri);
  }
  if (cached?.kind === 'miss') {
    if (cached.expiresAt > Date.now()) {
      return orderHeroUrisForClient(out).map(toClientDisplayCoverUri);
    }
    heroCache.delete(key);
  }

  const pending = heroInflight.get(key);
  if (pending) {
    const remote = await pending;
    for (const uri of remote) {
      pushUniqueUri(out, uri);
      if (out.length >= capped) break;
    }
    return orderHeroUrisForClient(out).map(toClientDisplayCoverUri);
  }

  const request = (async () => {
    try {
      const collected: string[] = [];
      for (const place of places) {
        if (collected.length >= capped) break;
        const next = await resolveRemoteCovers(place, capped - collected.length);
        for (const uri of next) {
          pushUniqueUri(collected, uri);
          if (collected.length >= capped) break;
        }
      }
      if (collected.length > 0) {
        heroCache.set(key, { kind: 'hit', uris: collected });
      } else {
        heroCache.set(key, {
          kind: 'miss',
          expiresAt: Date.now() + COVER_MISS_TTL_MS,
        });
      }
      return collected;
    } catch {
      return [];
    } finally {
      heroInflight.delete(key);
    }
  })();

  heroInflight.set(key, request);
  const remote = await request;
  for (const uri of remote) {
    pushUniqueUri(out, uri);
    if (out.length >= capped) break;
  }
  return orderHeroUrisForClient(out).map(toClientDisplayCoverUri);
}
