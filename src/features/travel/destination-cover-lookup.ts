/**
 * Destination-accurate cover lookup via free Wikimedia APIs + Openverse fallback.
 * Shared by the Expo API route (proper User-Agent) and the travel client.
 */

import { fetchWithTimeout } from '@/services/http/fetch-with-timeout';

export const DESTINATION_COVER_UA =
  'onTrack/1.0 (travel destination covers; https://ontrack.app)';

/** How many heroes the trip-card carousel shows at once. */
export const DESTINATION_COVER_MAX = 3;
/** Larger landmark pool so each open can rotate a different trio. */
export const DESTINATION_COVER_POOL_MAX = 12;

/**
 * True when the query already seeks an iconic travel draw (landmark, nature
 * wonder, famous site) — skip appending another draw suffix.
 */
export function hasDestinationLandmarkIntent(query: string): boolean {
  return /\b(landmark|monument|attraction|architecture|cathedral|temple|church|castle|palace|tower|bridge|waterfall|volcano|arch|skyline|iconic|famous|ruins?|aurora|northern\s+lights|glacier|geyser|lagoon|canyon|beach|mountain|scenic|geothermal|pyramid|colosseum|fuji|machu\s+picchu|must\s+see)\b/i.test(
    query.trim(),
  );
}

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

/**
 * Metadata / filename signals that the photo is stock of people (tourists,
 * portraits, crowds) rather than the destination itself.
 */
const DESTINATION_PEOPLE_PHOTO_RE =
  /\b(people|persons?|tourists?|travellers?|travelers?|selfie|selfies|portrait|portraits|crowd|crowds|couple|couples|family|families|wedding|bride|groom|model|models|hiker|hikers|backpacker|backpackers|swimmer|swimmers|bather|bathers|surfer|surfers|skier|skiers|man|men|woman|women|boy|girl|child|children|kid|kids|human|humans|face|faces|smiling|pose|posing)\b/i;

/** True when title/alt/URL text suggests a people-forward stock photo. */
export function destinationPhotoSuggestsPeople(
  ...parts: Array<string | undefined | null>
): boolean {
  const haystack = parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    // Filenames use _/-; treat them as word breaks for \b matching.
    .map((part) => part.replace(/[_/-]+/g, ' '))
    .join(' ');
  if (!haystack) return false;
  return DESTINATION_PEOPLE_PHOTO_RE.test(haystack);
}

/** Skip flags/maps, people stock, non-HTTPS assets, and Unsplash+ watermarks. */
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
  if (destinationPhotoSuggestsPeople(trimmed)) return false;
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

/** Pick a cover URL only when neither the URL nor metadata suggests people. */
export function pickPeopleFreeDestinationPhotoUrl(
  meta: Array<string | undefined | null>,
  ...candidates: Array<string | undefined | null>
): string | undefined {
  if (destinationPhotoSuggestsPeople(...meta, ...candidates)) return undefined;
  return pickDestinationPhotoUrl(...candidates);
}

/** Unsplash / Openverse: push landscape, exclude common people tags. */
function photoSearchQuery(place: string): string {
  const trimmed = place.trim();
  const base = hasDestinationLandmarkIntent(trimmed)
    ? trimmed
    : `${trimmed} iconic`;
  return `${base} landscape -people -person -tourist -portrait -selfie`;
}

function normalizeLimit(limit?: number): number {
  if (limit == null || !Number.isFinite(limit)) return 1;
  return Math.max(1, Math.min(DESTINATION_COVER_POOL_MAX, Math.floor(limit)));
}

function pushUniqueUrl(out: string[], url: string | undefined): void {
  if (!url) return;
  const key = url.toLowerCase();
  if (out.some((existing) => existing.toLowerCase() === key)) return;
  out.push(url);
}

type WikiSummary = {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
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
  return pickPeopleFreeDestinationPhotoUrl(
    [body.title, body.description, body.extract],
    body.originalimage?.source,
    body.thumbnail?.source,
  );
}

/** Prefer iconic travel draws over generic city stock. */
function commonsLandmarkSearch(place: string): string {
  const trimmed = place.trim();
  // Keep the place token first — loose OR queries drift to unrelated places.
  const base = hasDestinationLandmarkIntent(trimmed)
    ? trimmed
    : `${trimmed} iconic`;
  // CirrusSearch: prefer landscape files, drop obvious people titles.
  return `${base} -intitle:people -intitle:tourist -intitle:portrait -intitle:selfie`;
}

async function fetchCommonsSearchCovers(
  place: string,
  headers: Record<string, string>,
  limit: number,
): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: commonsLandmarkSearch(place),
    gsrnamespace: '6',
    gsrlimit: String(Math.max(12, limit * 4)),
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
              title?: string;
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
    pushUniqueUrl(
      out,
      pickPeopleFreeDestinationPhotoUrl(
        [page.title, info?.url, info?.thumburl],
        info?.thumburl,
        info?.url,
      ),
    );
  }
  return out;
}

async function fetchOpenverseCovers(
  place: string,
  headers: Record<string, string>,
  limit: number,
): Promise<string[]> {
  const url = `https://api.openverse.org/v1/images/?${new URLSearchParams({
    q: photoSearchQuery(place),
    page_size: String(Math.max(8, limit * 3)),
    category: 'photograph',
    extension: 'jpg,png',
  }).toString()}`;
  const body = (await fetchJson(url, headers)) as
    | {
        results?: Array<{
          title?: string;
          thumbnail?: string;
          url?: string;
          tags?: Array<string | { name?: string }>;
        }>;
      }
    | undefined;
  if (!body) return [];
  const out: string[] = [];
  for (const hit of body.results ?? []) {
    if (out.length >= limit) break;
    const tagText = (hit.tags ?? [])
      .map((tag) => (typeof tag === 'string' ? tag : tag.name))
      .filter(Boolean)
      .join(' ');
    pushUniqueUrl(
      out,
      pickPeopleFreeDestinationPhotoUrl(
        [hit.title, tagText, hit.url, hit.thumbnail],
        hit.url,
        hit.thumbnail,
      ),
    );
  }
  return out;
}

async function fetchUnsplashCovers(
  place: string,
  headers: Record<string, string>,
  limit: number,
): Promise<string[]> {
  const url = `https://unsplash.com/napi/search/photos?${new URLSearchParams({
    query: photoSearchQuery(place),
    per_page: String(Math.max(10, limit * 4)),
  }).toString()}`;
  const body = (await fetchJson(url, headers)) as
    | {
        results?: Array<{
          plus?: boolean;
          premium?: boolean;
          color?: string;
          description?: string | null;
          alt_description?: string | null;
          tags?: Array<{ title?: string }>;
          urls?: { regular?: string; small?: string };
        }>;
      }
    | undefined;
  if (!body) return [];
  const out: string[] = [];
  for (const hit of body.results ?? []) {
    if (out.length >= limit) break;
    if (hit.plus || hit.premium) continue;
    const tagText = (hit.tags ?? [])
      .map((tag) => tag.title)
      .filter(Boolean)
      .join(' ');
    const photoUrl = pickPeopleFreeDestinationPhotoUrl(
      [hit.description, hit.alt_description, tagText],
      hit.urls?.regular,
      hit.urls?.small,
    );
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
