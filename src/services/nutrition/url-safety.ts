const TRACKING_KEYS = /^(utm_|gclid$|fbclid$|mc_|ref$|session|token|auth|user|customer|order)/i;

function stripBrackets(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '');
}

/** Lightweight IP version check that works in React Native (no node:net). */
function ipVersion(address: string): 0 | 4 | 6 {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) {
    const parts = address.split('.').map((part) => Number(part));
    if (parts.length === 4 && parts.every((part) => part >= 0 && part <= 255)) return 4;
    return 0;
  }
  // Accept compressed IPv6 forms used by URL/DNS (including ::ffff:…).
  if (address.includes(':') && /^[0-9a-f:]+$/i.test(address)) return 6;
  return 0;
}

/** Map IPv4-mapped IPv6 (::ffff:x.x.x.x or ::ffff:7f00:1) down to IPv4. */
export function normalizeIpAddress(address: string): string {
  const trimmed = stripBrackets(address).toLowerCase();
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(trimmed);
  if (hex) {
    const hi = Number.parseInt(hex[1], 16);
    const lo = Number.parseInt(hex[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return trimmed;
}

/**
 * True for addresses that must never be fetched by meal/recipe link importers
 * (loopback, RFC1918, link-local, CGNAT, multicast/reserved, ULA).
 */
export function isPrivateIpAddress(address: string): boolean {
  const ip = normalizeIpAddress(address);
  const version = ipVersion(ip);
  if (version === 4) {
    const [a = 0, b = 0] = ip.split('.').map((part) => Number(part));
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    // Carrier-grade NAT — often still operator/internal.
    if (a === 100 && b >= 64 && b <= 127) return true;
    // Multicast and reserved.
    if (a >= 224) return true;
    return false;
  }
  if (version === 6) {
    if (ip === '::' || ip === '::1') return true;
    const first = Number.parseInt(ip.split(':', 1)[0] || '0', 16);
    if (Number.isNaN(first)) return true;
    // Unique local fc00::/7 and link-local fe80::/10.
    if ((first & 0xfe00) === 0xfc00) return true;
    if ((first & 0xffc0) === 0xfe80) return true;
    return false;
  }
  return false;
}

export function isPrivateHostname(hostname: string): boolean {
  const host = stripBrackets(hostname).replace(/\.$/, '').toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  if (ipVersion(host)) return isPrivateIpAddress(host);
  return false;
}

export function sanitizeMealUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Enter a complete HTTPS link.');
  }
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS meal links are supported.');
  if (parsed.username || parsed.password) throw new Error('Links containing credentials are not supported.');
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('Private network links are not supported.');
  }
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_KEYS.test(key)) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}
