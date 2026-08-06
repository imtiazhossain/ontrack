/**
 * Resolve sharp stay-provider brand marks from first-party icon endpoints
 * (and homepage discovery), falling back to Google’s high-res favicon feed.
 */

import { fetchWithTimeout as timedFetch } from '@/services/http/fetch-with-timeout';

const LOGO_UA = 'onTrack/1.0 (stay provider logos; https://ontrack.app)';
const LOOKUP_TIMEOUT_MS = 8_000;

/** Prefer live SVG brand marks (crisp at any size); PNG first-party as fallback. */
const FIRST_PARTY_LOGO_CANDIDATES: Record<string, string[]> = {
  'booking.com': [
    'https://unavatar.io/booking.com',
    'https://www.booking.com/apple-touch-icon.png',
  ],
  'airbnb.com': [
    'https://unavatar.io/airbnb.com',
    'https://a0.muscache.com/im/pictures/AirbnbPlatformAssets/AirbnbPlatformAssets-Favicons/original/d1fcc0b3-865f-485a-b28b-43ca0bf7c891.png?im_w=720',
  ],
  'hostelworld.com': [
    'https://www.hostelworld.com/hw-icon.svg',
    'https://www.hostelworld.com/any-icon-512x512.png',
    'https://www.hostelworld.com/pwa-512x512.png',
  ],
};

const logoCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function googleFaviconLogoUrl(domain: string, size = 256): string {
  const safeDomain = domain.trim().toLowerCase();
  const safeSize = Math.min(256, Math.max(64, Math.round(size)));
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(`https://${safeDomain}`)}&size=${safeSize}`;
}

/** Sync best-guess URI for first paint (first-party when known, else Google 256). */
export function stayProviderLogoUrl(domain: string, size = 256): string {
  const safeDomain = domain.trim().toLowerCase();
  const firstParty = FIRST_PARTY_LOGO_CANDIDATES[safeDomain]?.[0];
  if (firstParty) return firstParty;
  return googleFaviconLogoUrl(safeDomain, size);
}

function absoluteUrl(href: string, base: string): string | undefined {
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

/** Prefer a sharper Airbnb CDN render when the asset supports `im_w`. */
export function sharpenLogoUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.endsWith('muscache.com') &&
      parsed.searchParams.has('im_w')
    ) {
      parsed.searchParams.set('im_w', '720');
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}

function iconPixelHint(tag: string, href: string): number {
  const sizes = /\bsizes=["']([^"']+)["']/i.exec(tag)?.[1] ?? '';
  const fromSizes = /(\d+)\s*x\s*(\d+)/i.exec(sizes);
  if (fromSizes) return Math.min(Number(fromSizes[1]), Number(fromSizes[2]));

  const fromHref = /(\d{2,4})x(\d{2,4})/i.exec(href);
  if (fromHref) return Math.min(Number(fromHref[1]), Number(fromHref[2]));

  const widthParam = /[?&](?:im_w|w|width|size)=(\d{2,4})\b/i.exec(href);
  if (widthParam) return Number(widthParam[1]);

  if (/\.svg(?:$|\?)/i.test(href)) return 512;
  return 0;
}

type ScoredLogo = { href: string; score: number };

function sortLogoHrefs(icons: ScoredLogo[]): string[] {
  return icons
    .sort((a, b) => b.score - a.score)
    .map((item) => item.href)
    .filter((href, index, all) => all.indexOf(href) === index);
}

function parseIconCandidates(html: string, pageUrl: string): ScoredLogo[] {
  const icons: ScoredLogo[] = [];
  const linkRe = /<link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html))) {
    const tag = match[0];
    if (!/\brel=["'][^"']*icon[^"']*["']/i.test(tag)) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1]?.trim();
    if (!href) continue;
    const resolved = absoluteUrl(href, pageUrl);
    if (!resolved?.toLowerCase().startsWith('https://')) continue;
    if (resolved.toLowerCase().includes('.ico')) continue;

    const pixel = iconPixelHint(tag, resolved);
    // Skip tiny favicons — they look soft when scaled up to the provider row.
    if (pixel > 0 && pixel < 120 && !/\.svg(?:$|\?)/i.test(resolved)) continue;

    const isApple = /\bapple-touch-icon\b/i.test(tag) ? 20 : 0;
    const isSvg = /\.svg(?:$|\?)/i.test(resolved) ? 80 : 0;
    const isPng = /\.png(?:$|\?)/i.test(resolved) ? 20 : 0;
    const score = (pixel || 96) + isApple + isSvg + isPng;
    icons.push({ href: sharpenLogoUrl(resolved), score });
  }

  return icons;
}

/**
 * Hotels often ship the brand mark as a theme asset (`…/logo.svg`, `logo-black.png`)
 * without exposing it via `<link rel="icon">`. Pull those out of the homepage HTML.
 */
export function parseEmbeddedLogoCandidates(
  html: string,
  pageUrl: string,
): string[] {
  return sortLogoHrefs(collectEmbeddedLogoCandidates(html, pageUrl));
}

function collectEmbeddedLogoCandidates(
  html: string,
  pageUrl: string,
): ScoredLogo[] {
  const icons: ScoredLogo[] = [];
  const seen = new Set<string>();

  const consider = (raw: string, baseScore: number) => {
    const href = raw.trim();
    if (!href) return;
    const withProtocol = href.startsWith('//') ? `https:${href}` : href;
    const resolved = absoluteUrl(withProtocol, pageUrl);
    if (!resolved?.toLowerCase().startsWith('https://')) return;
    const lower = resolved.toLowerCase();
    if (!/logo/i.test(lower)) return;
    if (lower.includes('.ico')) return;
    if (seen.has(lower)) return;
    seen.add(lower);

    let score = baseScore;
    // Dark/black marks read on the light plates used in timeline pills.
    if (/logo[-_.]?(black|dark)/i.test(lower)) score += 160;
    if (/logo[-_.]?(color|full|primary)/i.test(lower)) score += 40;
    if (/\.svg(?:$|\?)/i.test(lower)) {
      score += /black|dark/i.test(lower) ? 80 : 20;
    } else if (/\.png(?:$|\?)/i.test(lower)) {
      score += 50;
    } else if (/\.webp(?:$|\?)/i.test(lower)) {
      score += 40;
    }
    icons.push({ href: sharpenLogoUrl(resolved), score });
  };

  const absoluteRe =
    /(?:https?:)?\/\/[^"'\\s<>]+?\/[^"'\\s<>]*logo[^"'\\s<>]*\.(?:svg|png|webp)(?:\?[^"'\\s<>]*)?/gi;
  let match: RegExpExecArray | null;
  while ((match = absoluteRe.exec(html))) {
    consider(match[0], 140);
  }

  const relativeRe =
    /["']([^"'<>]*\/logo[^"'<>]*\.(?:svg|png|webp)(?:\?[^"'<>]*)?)["']/gi;
  while ((match = relativeRe.exec(html))) {
    consider(match[1] ?? '', 130);
  }

  return icons;
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = LOOKUP_TIMEOUT_MS,
): Promise<Response> {
  return timedFetch(
    url,
    {
      ...init,
      headers: {
        Accept: '*/*',
        'User-Agent': LOGO_UA,
        ...(init?.headers ?? {}),
      },
    },
    timeoutMs,
  );
}

async function urlLooksLikeImage(url: string): Promise<boolean> {
  const looksSvg = /\.svg(?:$|\?)/i.test(url) || /unavatar\.io\//i.test(url);
  if (looksSvg) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-256', Accept: 'image/svg+xml,*/*' },
      });
      if (!(response.ok || response.status === 206)) return false;
      const type = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (type.includes('svg')) return true;
      const text = await response.text();
      return /<svg\b/i.test(text);
    } catch {
      return false;
    }
  }
  try {
    const head = await fetchWithTimeout(url, { method: 'HEAD' });
    if (head.ok) {
      const type = head.headers.get('content-type')?.toLowerCase() ?? '';
      if (type.startsWith('image/')) return true;
      if (type && !type.includes('html') && !type.includes('json')) return true;
    }
  } catch {
    // Some CDNs reject HEAD — fall through to a ranged GET.
  }
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-64', Accept: 'image/*,*/*' },
    });
    if (!(response.ok || response.status === 206)) return false;
    const type = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (type.startsWith('image/')) return true;
    const bytes = new Uint8Array(await response.arrayBuffer());
    // PNG / JPEG magic
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return true;
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
    return false;
  } catch {
    return false;
  }
}

async function discoverLogoFromHomepage(domain: string): Promise<string | undefined> {
  const pageUrl = `https://www.${domain}/`;
  try {
    const response = await fetchWithTimeout(pageUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    if (!response.ok) return undefined;
    const html = await response.text();
    if (html.length < 200) return undefined;
    const base = response.url || pageUrl;
    const candidates = sortLogoHrefs([
      ...collectEmbeddedLogoCandidates(html, base),
      ...parseIconCandidates(html, base),
    ]);
    for (const candidate of candidates) {
      if (await urlLooksLikeImage(candidate)) return candidate;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function resolveStayProviderBrandLogoUrl(
  domain: string,
): Promise<string | undefined> {
  for (const candidate of FIRST_PARTY_LOGO_CANDIDATES[domain] ?? []) {
    const sharpened = sharpenLogoUrl(candidate);
    if (await urlLooksLikeImage(sharpened)) return sharpened;
  }
  const discovered = await discoverLogoFromHomepage(domain);
  return discovered ? sharpenLogoUrl(discovered) : undefined;
}

/**
 * Brand mark only (first-party list or homepage `/logo*` assets).
 * Omits tiny favicon fallbacks — use when place photos are a better fallback.
 */
export async function lookupStayProviderBrandLogoUrl(
  domain: string,
): Promise<string | undefined> {
  const safeDomain = domain.trim().toLowerCase();
  if (!safeDomain) return undefined;
  try {
    return await resolveStayProviderBrandLogoUrl(safeDomain);
  } catch {
    return undefined;
  }
}

/** Async sharp logo URI — prefers first-party / discovered icons over favicons. */
export async function lookupStayProviderLogoUrl(domain: string): Promise<string> {
  const safeDomain = domain.trim().toLowerCase();
  const cached = logoCache.get(safeDomain);
  if (cached) return cached;

  const pending = inflight.get(safeDomain);
  if (pending) return pending;

  const request = (async () => {
    try {
      const brand = await resolveStayProviderBrandLogoUrl(safeDomain);
      if (brand) {
        logoCache.set(safeDomain, brand);
        return brand;
      }

      const fallback = googleFaviconLogoUrl(safeDomain, 256);
      logoCache.set(safeDomain, fallback);
      return fallback;
    } catch {
      const fallback = googleFaviconLogoUrl(safeDomain, 256);
      logoCache.set(safeDomain, fallback);
      return fallback;
    } finally {
      inflight.delete(safeDomain);
    }
  })();

  inflight.set(safeDomain, request);
  return request;
}
