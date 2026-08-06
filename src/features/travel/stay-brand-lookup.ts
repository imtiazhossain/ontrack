/**
 * Dynamic stay brand domain discovery from hotel name.
 * Used when booking URL / known-chain match is missing (e.g. Centerhotel → centerhotels.com).
 */

import { stayBrandDomain } from '@/features/travel/stay-company';
import { lookupStayProviderBrandLogoUrl } from '@/features/travel/stays/stay-provider-logo-lookup';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import { fetchWithTimeout } from '@/services/http/fetch-with-timeout';

export const STAY_BRAND_UA =
  'onTrack/1.0 (travel stay brand logos; https://ontrack.app)';

const LOOKUP_TIMEOUT_MS = 8_000;

/**
 * Guess likely brand domains from a stay title.
 * "Centerhotel Miðgarður" → centerhotels.com, centerhotel.com
 */
export function guessStayBrandDomains(title?: string): string[] {
  const raw = title?.trim();
  if (!raw) return [];

  const ascii = raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!ascii) return [];

  const out: string[] = [];
  const add = (domain: string) => {
    const next = domain.trim().toLowerCase();
    if (!next || out.includes(next)) return;
    out.push(next);
  };

  // Glued “…hotel” brand: Centerhotel → centerhotels.com
  const glued = /^([A-Za-z]{3,})hotels?\b/i.exec(ascii);
  if (glued?.[1]) {
    const base = `${glued[1].toLowerCase()}hotel`;
    add(`${base}s.com`);
    add(`${base}.com`);
  }

  // Spaced “Center Hotels …” / “City Hotel …”
  const spaced = /^([A-Za-z]{3,}(?:\s+[A-Za-z]{3,}){0,2})\s+Hotels?\b/i.exec(
    ascii,
  );
  if (spaced?.[1]) {
    const slug = spaced[1].toLowerCase().replace(/\s+/g, '');
    add(`${slug}hotels.com`);
    add(`${slug}hotel.com`);
    add(`${slug}.com`);
  }

  // First meaningful token as a brand slug.
  const stop = new Set([
    'hotel',
    'hotels',
    'hostel',
    'inn',
    'resort',
    'suite',
    'suites',
    'apartment',
    'apartments',
    'the',
    'and',
    'at',
  ]);
  const token = ascii
    .split(' ')
    .map((part) => part.toLowerCase())
    .find((part) => part.length >= 5 && !stop.has(part));
  if (token) {
    const slug = token.replace(/[^a-z0-9]/g, '');
    if (slug.length >= 5) {
      if (slug.endsWith('hotel')) {
        add(`${slug}s.com`);
        add(`${slug}.com`);
      } else {
        add(`${slug}hotels.com`);
        add(`${slug}.com`);
      }
    }
  }

  return out;
}

async function fetchJson(
  url: string,
  userAgent: string,
): Promise<unknown | undefined> {
  try {
    const response = await fetchWithTimeout(
      url,
      { headers: { Accept: 'application/json', 'User-Agent': userAgent } },
      LOOKUP_TIMEOUT_MS,
    );
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Official website host from Wikidata P856, when the hotel/chain is indexed. */
export async function lookupStayBrandDomainViaWikidata(
  title: string,
  userAgent = STAY_BRAND_UA,
): Promise<string | undefined> {
  const query = title.trim();
  if (query.length < 3) return undefined;

  const search = (await fetchJson(
    `https://www.wikidata.org/w/api.php?${new URLSearchParams({
      action: 'wbsearchentities',
      search: query,
      language: 'en',
      limit: '5',
      format: 'json',
      origin: '*',
    })}`,
    userAgent,
  )) as { search?: Array<{ id?: string; label?: string; description?: string }> } | undefined;

  const ids = (search?.search ?? [])
    .filter((hit) => {
      const hay = `${hit.label ?? ''} ${hit.description ?? ''}`.toLowerCase();
      return /hotel|hostel|resort|lodging|accommodation/.test(hay) || !hit.description;
    })
    .map((hit) => hit.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, 3);

  if (!ids.length) return undefined;

  const entities = (await fetchJson(
    `https://www.wikidata.org/w/api.php?${new URLSearchParams({
      action: 'wbgetentities',
      ids: ids.join('|'),
      props: 'claims',
      format: 'json',
      origin: '*',
    })}`,
    userAgent,
  )) as {
    entities?: Record<
      string,
      { claims?: { P856?: Array<{ mainsnak?: { datavalue?: { value?: string } } }> } }
    >;
  } | undefined;

  for (const id of ids) {
    const claim = entities?.entities?.[id]?.claims?.P856?.[0];
    const website = claim?.mainsnak?.datavalue?.value?.trim();
    if (!website) continue;
    try {
      const host = new URL(website).hostname.replace(/^www\./i, '').toLowerCase();
      if (host.includes('.')) return host;
    } catch {
      // ignore bad website values
    }
  }
  return undefined;
}

/** True when the host looks like a live site (DNS + HTTPS responds). */
export async function stayBrandDomainLooksLive(
  domain: string,
  userAgent = STAY_BRAND_UA,
): Promise<boolean> {
  const host = domain.trim().toLowerCase();
  if (!host.includes('.')) return false;
  try {
    const response = await fetchWithTimeout(
      `https://www.${host}/`,
      {
        method: 'HEAD',
        headers: { 'User-Agent': userAgent },
        redirect: 'follow',
      },
      LOOKUP_TIMEOUT_MS,
    );
    // 2xx/3xx, plus hosts that disallow HEAD with 405 but still resolve.
    return (
      response.ok ||
      response.status === 405 ||
      (response.status >= 300 && response.status < 400)
    );
  } catch {
    // Some hosts block HEAD — try a cheap GET range via unavatar existence.
    try {
      const logo = await fetchWithTimeout(
        `https://unavatar.io/${host}?fallback=false`,
        { method: 'HEAD', headers: { 'User-Agent': userAgent } },
        LOOKUP_TIMEOUT_MS,
      );
      return logo.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Resolve a brand domain for logo lookup:
 * known chain / booking URL → name guesses → Wikidata official website.
 */
export async function lookupStayBrandDomain(
  input: { title?: string; bookingUrl?: string },
  options?: { userAgent?: string },
): Promise<string | undefined> {
  const sync = stayBrandDomain(input);
  if (sync) return sync;

  const title = input.title?.trim();
  if (!title) return undefined;
  const userAgent = options?.userAgent ?? STAY_BRAND_UA;

  for (const guess of guessStayBrandDomains(title)) {
    if (await stayBrandDomainLooksLive(guess, userAgent)) return guess;
  }

  return lookupStayBrandDomainViaWikidata(title, userAgent);
}

const BRAND_FETCH_TIMEOUT_MS = 12_000;
const BRAND_MISS_TTL_MS = 60_000;

export type StayBrandMark = {
  domain: string;
  logoUri?: string;
};

type BrandCacheEntry =
  | { kind: 'hit'; mark: StayBrandMark }
  | { kind: 'miss'; expiresAt: number };

const brandCache = new Map<string, BrandCacheEntry>();
const brandInflight = new Map<string, Promise<StayBrandMark | undefined>>();

function brandCacheKey(input: { title?: string; bookingUrl?: string }): string {
  return `v2|${input.title?.trim().toLowerCase() ?? ''}|${input.bookingUrl?.trim().toLowerCase() ?? ''}`;
}

function stayBrandApiUrl(input: {
  title: string;
  bookingUrl?: string;
}): string | undefined {
  try {
    const params = new URLSearchParams({ title: input.title });
    if (input.bookingUrl) params.set('bookingUrl', input.bookingUrl);
    return resolveExpoApiUrl(`/api/stay-brand?${params}`, {
      configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      createNotConfiguredError: () => new Error('missing'),
    });
  } catch {
    return undefined;
  }
}

async function resolveLocalStayBrandMark(input: {
  title?: string;
  bookingUrl?: string;
}): Promise<StayBrandMark | undefined> {
  const domain = await lookupStayBrandDomain(input);
  if (!domain) return undefined;
  const logoUri = await lookupStayProviderBrandLogoUrl(domain);
  return { domain, logoUri };
}

/**
 * Client entry: Expo API (preferred) then direct name → domain + homepage logo.
 * Results are memory-cached so timeline pills don't re-scrape hotel sites.
 */
export async function fetchStayBrandMark(input: {
  title?: string;
  bookingUrl?: string;
}): Promise<StayBrandMark | undefined> {
  const sync = stayBrandDomain(input);
  const title = input.title?.trim();
  if (!sync && !title) return undefined;

  const key = brandCacheKey({
    title: title ?? sync,
    bookingUrl: input.bookingUrl,
  });
  const cached = brandCache.get(key);
  if (cached?.kind === 'hit') return cached.mark;
  if (cached?.kind === 'miss' && cached.expiresAt > Date.now()) return undefined;

  const pending = brandInflight.get(key);
  if (pending) return pending;

  const work = (async (): Promise<StayBrandMark | undefined> => {
    if (title) {
      const apiUrl = stayBrandApiUrl({ title, bookingUrl: input.bookingUrl });
      if (apiUrl) {
        try {
          const response = await fetchWithTimeout(
            apiUrl,
            { headers: { Accept: 'application/json' } },
            BRAND_FETCH_TIMEOUT_MS,
          );
          if (response.ok) {
            const body = (await response.json()) as {
              domain?: string;
              logoUri?: string | null;
            };
            const domain = body.domain?.trim().toLowerCase();
            if (domain) {
              const mark: StayBrandMark = {
                domain,
                logoUri: body.logoUri?.trim() || undefined,
              };
              if (!mark.logoUri) {
                mark.logoUri = await lookupStayProviderBrandLogoUrl(domain);
              }
              brandCache.set(key, { kind: 'hit', mark });
              return mark;
            }
          }
        } catch {
          // Fall through to direct lookup.
        }
      }
    }

    const mark = sync
      ? {
          domain: sync,
          logoUri: await lookupStayProviderBrandLogoUrl(sync),
        }
      : await resolveLocalStayBrandMark({
          title,
          bookingUrl: input.bookingUrl,
        });

    if (mark?.domain) {
      brandCache.set(key, { kind: 'hit', mark });
      return mark;
    }
    brandCache.set(key, {
      kind: 'miss',
      expiresAt: Date.now() + BRAND_MISS_TTL_MS,
    });
    return undefined;
  })();

  brandInflight.set(key, work);
  try {
    return await work;
  } finally {
    brandInflight.delete(key);
  }
}

/** @deprecated Prefer `fetchStayBrandMark` when a logo URI is needed. */
export async function fetchStayBrandDomain(input: {
  title?: string;
  bookingUrl?: string;
}): Promise<string | undefined> {
  return (await fetchStayBrandMark(input))?.domain;
}
