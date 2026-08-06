/**
 * Resolve a stay brand / OTA domain for logo lookup from booking URL or title.
 */

/** Hosts that are booking redirects / maps — not useful brand marks. */
const SKIP_HOSTS = new Set([
  'trivago.com',
  'trivago.deals',
  'google.com',
  'www.google.com',
  'maps.google.com',
  'goo.gl',
  'bit.ly',
  't.co',
]);

const STAY_CHAIN_DOMAINS: Array<{ match: RegExp; domain: string }> = [
  { match: /\bhilton\b/i, domain: 'hilton.com' },
  { match: /\bmarriott\b/i, domain: 'marriott.com' },
  { match: /\bhyatt\b/i, domain: 'hyatt.com' },
  { match: /\bihg\b|\bintercontinental\b|\bholiday\s*inn\b|\bcrowne?\s*plaza\b/i, domain: 'ihg.com' },
  { match: /\bsheraton\b|\bwestin\b|\bst\.?\s*regis\b|\britz[- ]?carlton\b/i, domain: 'marriott.com' },
  { match: /\bfour\s*seasons\b/i, domain: 'fourseasons.com' },
  { match: /\bnovotel\b|\bibis\b|\bsofitel\b|\bmercure\b|\baccor\b/i, domain: 'accor.com' },
  { match: /\bradisson\b/i, domain: 'radissonhotels.com' },
  { match: /\bbest\s*western\b/i, domain: 'bestwestern.com' },
  { match: /\bwyndham\b/i, domain: 'wyndhamhotels.com' },
  { match: /\bchoice\s*hotels\b|\bcomfort\s*inn\b|\bquality\s*inn\b/i, domain: 'choicehotels.com' },
  { match: /\bairbnb\b/i, domain: 'airbnb.com' },
  { match: /\bbooking\.com\b/i, domain: 'booking.com' },
  { match: /\bhostelworld\b/i, domain: 'hostelworld.com' },
  { match: /\bhotels\.com\b/i, domain: 'hotels.com' },
  { match: /\bexpedia\b/i, domain: 'expedia.com' },
  { match: /\bvrbo\b/i, domain: 'vrbo.com' },
];

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, '');
}

/** Brand domain from an https booking URL, when the host looks like a company site. */
export function stayBrandDomainFromBookingUrl(
  bookingUrl?: string,
): string | undefined {
  const raw = bookingUrl?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return undefined;
    const host = normalizeHost(url.hostname);
    if (!host || SKIP_HOSTS.has(host)) return undefined;
    // Drop deep subdomains like us.booking.com → booking.com when possible.
    const parts = host.split('.');
    if (parts.length > 2) {
      const base = parts.slice(-2).join('.');
      if (base === 'co.uk' && parts.length > 3) {
        return parts.slice(-3).join('.');
      }
      if (base !== 'co.uk') return base;
    }
    return host;
  } catch {
    return undefined;
  }
}

/** Hotel chain / OTA domain inferred from the stay title. */
export function stayBrandDomainFromTitle(title?: string): string | undefined {
  const value = title?.trim();
  if (!value) return undefined;
  for (const entry of STAY_CHAIN_DOMAINS) {
    if (entry.match.test(value)) return entry.domain;
  }
  return undefined;
}

/** Prefer booking URL host, else known chain/OTA name in the title. */
export function stayBrandDomain(input: {
  title?: string;
  bookingUrl?: string;
}): string | undefined {
  return (
    stayBrandDomainFromBookingUrl(input.bookingUrl) ??
    stayBrandDomainFromTitle(input.title)
  );
}
