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

function parseIconCandidates(html: string, pageUrl: string): string[] {
  const icons: Array<{ href: string; score: number }> = [];
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

  return icons
    .sort((a, b) => b.score - a.score)
    .map((item) => item.href)
    .filter((href, index, all) => all.indexOf(href) === index);
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
    for (const candidate of parseIconCandidates(html, response.url || pageUrl)) {
      if (await urlLooksLikeImage(candidate)) return candidate;
    }
  } catch {
    return undefined;
  }
  return undefined;
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
      for (const candidate of FIRST_PARTY_LOGO_CANDIDATES[safeDomain] ?? []) {
        const sharpened = sharpenLogoUrl(candidate);
        if (await urlLooksLikeImage(sharpened)) {
          logoCache.set(safeDomain, sharpened);
          return sharpened;
        }
      }

      const discovered = await discoverLogoFromHomepage(safeDomain);
      if (discovered) {
        const sharpened = sharpenLogoUrl(discovered);
        logoCache.set(safeDomain, sharpened);
        return sharpened;
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
