/**
 * Reflect only explicitly allowlisted browser origins. Native app requests
 * typically omit Origin and do not need CORS. Wildcard + credentials/tokens
 * would let any website drive authenticated API calls from a victim browser.
 */
export function apiCorsHeaders(
  request?: Request,
  methods = 'POST, OPTIONS',
): Record<string, string> {
  const allowed = new Set(
    (process.env.ALLOWED_ORIGINS ?? process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL ?? '')
      .split(',')
      .map((origin: string) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );
  const origin = request?.headers.get('Origin')?.replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };
  if (origin && allowed.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function apiOptionsResponse(request: Request, methods?: string) {
  return new Response(null, {
    status: 204,
    headers: apiCorsHeaders(request, methods),
  });
}
