import {
    isUsableDestinationPhotoUrl,
    lookupDestinationCoverUrl
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
const coverCache = new Map<string, CoverCacheEntry>();
const inflight = new Map<string, Promise<string | undefined>>();

export {
    enlargeWikimediaThumb,
    isUsableDestinationPhotoUrl
} from '@/features/travel/destination-cover-lookup';

/** Custom cover, else first moment photo. */
export function localTripCoverUri(plan: TravelPlan): string | undefined {
  if (plan.coverUri) {
    const custom = resolveTravelPhotoUris([plan.coverUri])[0];
    if (custom) return custom;
  }
  for (const item of plan.itinerary ?? []) {
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

function cacheKey(plan: TravelPlan): string {
  // Prefix bumps invalidate stale negative caches after provider changes.
  return `wiki-v5|${destinationCoverCandidates(plan).join('|').toLowerCase()}`;
}

function coverApiUrl(place: string): string | undefined {
  try {
    return resolveExpoApiUrl(
      `/api/destination-cover?q=${encodeURIComponent(place)}`,
      {
        configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
        createNotConfiguredError: () => new Error('missing'),
      },
    );
  } catch {
    return undefined;
  }
}

/** Prefer Expo API (server User-Agent) then direct Openverse fallback. */
async function resolveRemoteCover(place: string): Promise<string | undefined> {
  const apiUrl = coverApiUrl(place);
  if (apiUrl) {
    try {
      const response = await fetchWithTimeout(
        apiUrl,
        { headers: { Accept: 'application/json' } },
        COVER_FETCH_TIMEOUT_MS,
      );
      if (response.ok) {
        const body = (await response.json()) as { uri?: string };
        const uri = body.uri?.trim();
        if (uri && isUsableDestinationPhotoUrl(uri)) return uri;
      }
    } catch {
      // Fall through to direct lookup.
    }
  }

  try {
    return await Promise.race([
      lookupDestinationCoverUrl(place),
      new Promise<undefined>((resolve) => {
        setTimeout(() => resolve(undefined), COVER_FETCH_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return undefined;
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

  const key = `place-v1|${places.join('|').toLowerCase()}`;
  const cached = coverCache.get(key);
  if (cached?.kind === 'hit') return cached.uri;
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
          return next;
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
