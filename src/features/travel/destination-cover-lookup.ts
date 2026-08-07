/**
 * Destination-accurate cover lookup via free Wikimedia APIs + Openverse fallback.
 * Shared by the Expo API route (proper User-Agent) and the travel client.
 */

import { fetchWithTimeout } from '@/services/http/fetch-with-timeout';

export const DESTINATION_COVER_UA =
  'onTrack/1.0 (travel destination covers; https://ontrack.app)';

export const DESTINATION_COVER_MAX = 3;

/** Hosts the cover-image proxy is allowed to fetch (Wikimedia / Openverse). */
const DESTINATION_COVER_IMAGE_HOST_SUFFIXES = [
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'wikipedia.org',
  'wikimedia.org',
  'openverse.org',
  'wordpress.com',
] as const;

/**
 * Hosts RN Image can usually load without the Wikimedia User-Agent proxy.
 * Prefer at least one of these in hero carousels so cards still show photos
 * when `/api/destination-cover-image` is unavailable.
 */
const DIRECT_CLIENT_COVER_HOST_SUFFIXES = [
  'images.unsplash.com',
  'unsplash.com',
  'wordpress.com',
  'wp.com',
  'staticflickr.com',
] as const;

/** Dominant plate colors from Unsplash search hits (uri / photo-id → #hex). */
const unsplashCoverColorByUri = new Map<string, string>();

function unsplashPhotoId(uri: string): string | undefined {
  const match = uri.match(/photo-([a-zA-Z0-9_-]+)/);
  return match?.[1];
}

/** Average / dominant Unsplash color when the URI was resolved via search. */
export function peekUnsplashCoverColor(uri: string): string | undefined {
  const key = uri.trim();
  if (!key) return undefined;
  const direct = unsplashCoverColorByUri.get(key);
  if (direct) return direct;
  const photoId = unsplashPhotoId(key);
  return photoId ? unsplashCoverColorByUri.get(`id:${photoId}`) : undefined;
}

function rememberUnsplashCoverColor(uri: string | undefined, color: unknown) {
  const nextUri = uri?.trim();
  const nextColor = typeof color === 'string' ? color.trim() : '';
  if (!nextUri || !/^#[0-9a-fA-F]{3,8}$/.test(nextColor)) return;
  unsplashCoverColorByUri.set(nextUri, nextColor);
  const photoId = unsplashPhotoId(nextUri);
  if (photoId) unsplashCoverColorByUri.set(`id:${photoId}`, nextColor);
}

/** Skip flags/maps, non-HTTPS assets, and watermarked Unsplash+ previews. */
export function isUsableDestinationPhotoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith('https://')) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('.svg')) return false;
  if (/(^|\/)flag[_-]|coat_of_arms|locator_map|location_map/i.test(lower)) {
    return false;
  }
  // Unsplash+ / premium previews ship with visible watermarks — never use them.
  if (
    lower.includes('plus.unsplash.com') ||
    lower.includes('premium_photo-') ||
    lower.includes('unsplash-premium-photos')
  ) {
    return false;
  }
  return true;
}

/** True when the cover-image proxy may fetch this remote URL. */
export function isAllowedDestinationCoverImageUrl(url: string): boolean {
  if (!isUsableDestinationPhotoUrl(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DESTINATION_COVER_IMAGE_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

/** True when the native image loader can fetch this URL without our proxy. */
export function isDirectClientCoverUrl(url: string): boolean {
  if (!isUsableDestinationPhotoUrl(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DIRECT_CLIENT_COVER_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

/** Prefer a sharper Wikimedia thumb when the summary returns a tiny one. */
export function enlargeWikimediaThumb(url: string, width = 800): string {
  return url.replace(/\/\d+px-/, `/${width}px-`);
}

export function pickDestinationPhotoUrl(
  ...candidates: Array<string | undefined | null>
): string | undefined {
  for (const candidate of candidates) {
    const next = candidate?.trim();
    if (!next || !isUsableDestinationPhotoUrl(next)) continue;
    return enlargeWikimediaThumb(next);
  }
  return undefined;
}

function normalizeLimit(limit?: number): number {
  if (limit == null || !Number.isFinite(limit)) return 1;
  return Math.max(1, Math.min(DESTINATION_COVER_MAX, Math.floor(limit)));
}

function pushUniqueUrl(out: string[], url: string | undefined): void {
  if (!url) return;
  const key = url.toLowerCase();
  if (out.some((existing) => existing.toLowerCase() === key)) return;
  out.push(url);
}

type WikiSummary = {
  type?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

async function fetchJson(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 8_000,
): Promise<unknown | undefined> {
  try {
    const response = await fetchWithTimeout(url, { headers }, timeoutMs);
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  }
}

async function fetchWikiSummaryCover(
  host: 'en.wikipedia.org' | 'en.wikivoyage.org',
  place: string,
  headers: Record<string, string>,
): Promise<string | undefined> {
  const title = encodeURIComponent(place.replace(/ /g, '_'));
  const body = (await fetchJson(
    `https://${host}/api/rest_v1/page/summary/${title}`,
    headers,
  )) as WikiSummary | undefined;
  if (!body || (body.type && body.type !== 'standard')) return undefined;
  return pickDestinationPhotoUrl(
    body.originalimage?.source,
    body.thumbnail?.source,
  );
}

async function fetchCommonsSearchCovers(
  place: string,
  headers: Record<string, string>,
  limit: number,
): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${place} landscape`,
    gsrnamespace: '6',
    gsrlimit: String(Math.max(8, limit * 3)),
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '800',
    format: 'json',
    origin: '*',
  });
  const body = (await fetchJson(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
    headers,
  )) as
    | {
        query?: {
          pages?: Record<
            string,
            {
              imageinfo?: Array<{
                url?: string;
                thumburl?: string;
                mime?: string;
              }>;
            }
          >;
        };
      }
    | undefined;
  if (!body) return [];
  const out: string[] = [];
  for (const page of Object.values(body.query?.pages ?? {})) {
    if (out.length >= limit) break;
    const info = page.imageinfo?.[0];
    const mime = info?.mime?.toLowerCase() ?? '';
    if (mime && !mime.startsWith('image/jpeg') && !mime.startsWith('image/png')) {
      continue;
    }
    pushUniqueUrl(out, pickDestinationPhotoUrl(info?.thumburl, info?.url));
  }
  return out;
}

async function fetchOpenverseCovers(
  place: string,
  headers: Record<string, string>,
  limit: number,
): Promise<string[]> {
  const url = `https://api.openverse.org/v1/images/?${new URLSearchParams({
    q: place,
    page_size: String(Math.max(5, limit * 2)),
    category: 'photograph',
    extension: 'jpg,png',
  }).toString()}`;
  const body = (await fetchJson(url, headers)) as
    | { results?: Array<{ thumbnail?: string; url?: string }> }
    | undefined;
  if (!body) return [];
  const out: string[] = [];
  for (const hit of body.results ?? []) {
    if (out.length >= limit) break;
    pushUniqueUrl(out, pickDestinationPhotoUrl(hit.url, hit.thumbnail));
  }
  return out;
}

async function fetchUnsplashCovers(
  place: string,
  headers: Record<string, string>,
  limit: number,
): Promise<string[]> {
  const url = `https://unsplash.com/napi/search/photos?${new URLSearchParams({
    query: place,
    per_page: String(Math.max(6, limit * 3)),
  }).toString()}`;
  const body = (await fetchJson(url, headers)) as
    | {
        results?: Array<{
          plus?: boolean;
          premium?: boolean;
          color?: string;
          urls?: { regular?: string; small?: string };
        }>;
      }
    | undefined;
  if (!body) return [];
  const out: string[] = [];
  for (const hit of body.results ?? []) {
    if (out.length >= limit) break;
    if (hit.plus || hit.premium) continue;
    const photoUrl = pickDestinationPhotoUrl(hit.urls?.regular, hit.urls?.small);
    if (!photoUrl) continue;
    rememberUnsplashCoverColor(photoUrl, hit.color);
    pushUniqueUrl(out, photoUrl);
  }
  return out;
}

function coverHeaders(userAgent?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Api-User-Agent': userAgent ?? DESTINATION_COVER_UA,
  };
  if (userAgent) headers['User-Agent'] = userAgent;
  return headers;
}

/**
 * Merge Wikimedia-first results with at least one direct-loadable URL when
 * available so trip cards still render if the image proxy is down.
 */
export function mergeDestinationCoverUrls(
  primary: string[],
  direct: string[],
  limit: number,
): string[] {
  const capped = normalizeLimit(limit);
  const out: string[] = [];
  const append = (url: string | undefined) => {
    if (!url || out.length >= capped) return;
    pushUniqueUrl(out, url);
  };

  const directUsable = direct.filter(isDirectClientCoverUrl);
  // Keep destination-accurate Wikimedia first, but reserve a slot for a
  // direct-loadable backup whenever the list would otherwise be proxy-only.
  for (const url of primary) append(url);
  if (directUsable.length > 0 && !out.some(isDirectClientCoverUrl)) {
    if (out.length >= capped) {
      out[capped - 1] = directUsable[0]!;
    } else {
      append(directUsable[0]);
    }
  }
  for (const url of directUsable) append(url);
  return out.slice(0, capped);
}

/**
 * Up to `limit` destination-relevant landscape URLs (max 3).
 * Prefer variety across providers when a single source under-delivers.
 */
export async function lookupDestinationCoverUrls(
  place: string,
  options?: { userAgent?: string; limit?: number },
): Promise<string[]> {
  const trimmed = place.trim();
  if (!trimmed) return [];

  const limit = normalizeLimit(options?.limit);
  const headers = coverHeaders(options?.userAgent);
  const primary: string[] = [];

  const appendPrimary = (urls: string[]) => {
    for (const url of urls) {
      if (primary.length >= limit) return;
      pushUniqueUrl(primary, url);
    }
  };

  // Prefer Wikimedia / Openverse (clean licensing) before Unsplash napi.
  pushUniqueUrl(
    primary,
    await fetchWikiSummaryCover('en.wikipedia.org', trimmed, headers),
  );
  if (primary.length < limit) {
    pushUniqueUrl(
      primary,
      await fetchWikiSummaryCover('en.wikivoyage.org', trimmed, headers),
    );
  }
  if (primary.length < limit) {
    appendPrimary(
      await fetchCommonsSearchCovers(trimmed, headers, limit - primary.length),
    );
  }
  if (primary.length < limit) {
    appendPrimary(
      await fetchOpenverseCovers(trimmed, headers, limit - primary.length),
    );
  }

  // Always probe Unsplash so clients can show a photo without the Wiki proxy.
  const direct = await fetchUnsplashCovers(trimmed, headers, limit);
  return mergeDestinationCoverUrls(primary, direct, limit);
}

/** Single cover URL for a place name (server should pass a real User-Agent). */
export async function lookupDestinationCoverUrl(
  place: string,
  options?: { userAgent?: string },
): Promise<string | undefined> {
  const urls = await lookupDestinationCoverUrls(place, {
    ...options,
    limit: 1,
  });
  return urls[0];
}
