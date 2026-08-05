/**
 * Destination-accurate cover lookup via free Wikimedia APIs + Openverse fallback.
 * Shared by the Expo API route (proper User-Agent) and the travel client.
 */

import { fetchWithTimeout } from '@/services/http/fetch-with-timeout';

export const DESTINATION_COVER_UA =
  'onTrack/1.0 (travel destination covers; https://ontrack.app)';

/** Skip flags/maps and non-HTTPS assets. */
export function isUsableDestinationPhotoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith('https://')) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('.svg')) return false;
  if (/(^|\/)flag[_-]|coat_of_arms|locator_map|location_map/i.test(lower)) {
    return false;
  }
  return true;
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

async function fetchCommonsSearchCover(
  place: string,
  headers: Record<string, string>,
): Promise<string | undefined> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${place} landscape`,
    gsrnamespace: '6',
    gsrlimit: '8',
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
  if (!body) return undefined;
  for (const page of Object.values(body.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    const mime = info?.mime?.toLowerCase() ?? '';
    if (mime && !mime.startsWith('image/jpeg') && !mime.startsWith('image/png')) {
      continue;
    }
    const next = pickDestinationPhotoUrl(info?.thumburl, info?.url);
    if (next) return next;
  }
  return undefined;
}

async function fetchOpenverseCover(
  place: string,
  headers: Record<string, string>,
): Promise<string | undefined> {
  const url = `https://api.openverse.org/v1/images/?${new URLSearchParams({
    q: place,
    page_size: '5',
    category: 'photograph',
    extension: 'jpg,png',
  }).toString()}`;
  const body = (await fetchJson(url, headers)) as
    | { results?: Array<{ thumbnail?: string; url?: string }> }
    | undefined;
  if (!body) return undefined;
  for (const hit of body.results ?? []) {
    const next = pickDestinationPhotoUrl(hit.url, hit.thumbnail);
    if (next) return next;
  }
  return undefined;
}

async function fetchUnsplashCover(
  place: string,
  headers: Record<string, string>,
): Promise<string | undefined> {
  const url = `https://unsplash.com/napi/search/photos?${new URLSearchParams({
    query: place,
    per_page: '3',
  }).toString()}`;
  const body = (await fetchJson(url, headers)) as
    | { results?: Array<{ urls?: { regular?: string; small?: string } }> }
    | undefined;
  if (!body) return undefined;
  for (const hit of body.results ?? []) {
    const next = pickDestinationPhotoUrl(hit.urls?.regular, hit.urls?.small);
    if (next) return next;
  }
  return undefined;
}

/** Wikimedia-first cover URL for a place name (server should pass a real User-Agent). */
export async function lookupDestinationCoverUrl(
  place: string,
  options?: { userAgent?: string },
): Promise<string | undefined> {
  const trimmed = place.trim();
  if (!trimmed) return undefined;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Api-User-Agent': options?.userAgent ?? DESTINATION_COVER_UA,
  };
  if (options?.userAgent) {
    headers['User-Agent'] = options.userAgent;
  }

  const unsplash = await fetchUnsplashCover(trimmed, headers);
  if (unsplash) return unsplash;

  const wikipedia = await fetchWikiSummaryCover(
    'en.wikipedia.org',
    trimmed,
    headers,
  );
  if (wikipedia) return wikipedia;

  const wikivoyage = await fetchWikiSummaryCover(
    'en.wikivoyage.org',
    trimmed,
    headers,
  );
  if (wikivoyage) return wikivoyage;

  const commons = await fetchCommonsSearchCover(trimmed, headers);
  if (commons) return commons;

  return fetchOpenverseCover(trimmed, headers);
}
