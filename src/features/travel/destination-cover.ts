import {
  enlargeWikimediaThumb,
  isUsableDestinationPhotoUrl,
  lookupDestinationCoverUrl,
} from '@/features/travel/destination-cover-lookup';
import {
  persistTravelMomentPhotos,
  resolveTravelPhotoUris,
} from '@/features/travel/travel-moment-media';
import type { TravelPlan } from '@/features/travel/types';
import { resolveExpoApiUrl } from '@/services/http/api-url';

const COVER_FETCH_TIMEOUT_MS = 8_000;
const coverCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | undefined>>();

export {
  enlargeWikimediaThumb,
  isUsableDestinationPhotoUrl,
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

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = COVER_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Prefer Expo API (server User-Agent) then direct Openverse fallback. */
async function resolveRemoteCover(place: string): Promise<string | undefined> {
  const apiUrl = coverApiUrl(place);
  if (apiUrl) {
    try {
      const response = await fetchWithTimeout(apiUrl, {
        headers: { Accept: 'application/json' },
      });
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

/** Resolve a remote destination cover URL (cached per destination query). */
export async function fetchDestinationCoverUri(
  plan: TravelPlan,
): Promise<string | undefined> {
  const local = localTripCoverUri(plan);
  if (local) return local;

  const key = cacheKey(plan);
  if (!key.trim()) return undefined;
  if (coverCache.has(key)) {
    const cached = coverCache.get(key);
    return cached ?? undefined;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const candidates = destinationCoverCandidates(plan);
      for (const place of candidates) {
        const next = await resolveRemoteCover(place);
        if (next) {
          coverCache.set(key, next);
          return next;
        }
      }
      coverCache.set(key, null);
      return undefined;
    } catch {
      coverCache.set(key, null);
      return undefined;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}
