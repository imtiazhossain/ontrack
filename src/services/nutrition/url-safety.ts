const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

const TRACKING_KEYS = /^(utm_|gclid$|fbclid$|mc_|ref$|session|token|auth|user|customer|order)/i;

export function sanitizeMealUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Enter a complete HTTPS link.');
  }
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS meal links are supported.');
  if (parsed.username || parsed.password) throw new Error('Links containing credentials are not supported.');
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new Error('Private network links are not supported.');
  }
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_KEYS.test(key)) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

export function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}
