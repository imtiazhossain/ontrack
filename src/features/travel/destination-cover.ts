import {
  persistTravelMomentPhotos,
  resolveTravelPhotoUris,
} from '@/features/travel/travel-moment-media';
import type { TravelPlan } from '@/features/travel/types';

const coverCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | undefined>>();

/** Custom cover, else first moment photo. */
export function localTripCoverUri(plan: TravelPlan): string | undefined {
  if (plan.coverUri) {
    const custom = resolveTravelPhotoUris([plan.coverUri])[0];
    if (custom) return custom;
  }
  for (const item of plan.itinerary) {
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

function coverQuery(plan: TravelPlan): string {
  const destination = plan.destination.trim() || plan.title.trim();
  return `${destination} landscape`;
}

function cacheKey(plan: TravelPlan): string {
  return coverQuery(plan).toLowerCase();
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
      const url =
        `https://api.openverse.org/v1/images/?${new URLSearchParams({
          q: coverQuery(plan),
          page_size: '1',
          category: 'photograph',
        }).toString()}`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'onTrack/1.0 (travel destination covers)',
        },
      });
      if (!response.ok) {
        coverCache.set(key, null);
        return undefined;
      }
      const body = (await response.json()) as {
        results?: Array<{ thumbnail?: string; url?: string }>;
      };
      const hit = body.results?.[0];
      const next = hit?.thumbnail?.trim() || hit?.url?.trim();
      coverCache.set(key, next || null);
      return next || undefined;
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
