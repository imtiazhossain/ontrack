import { guardedFetch } from './dependency-guard';

export type ApiAuthResult =
  | { status: 'ok'; userId: string }
  | { status: 'unauthenticated' }
  | { status: 'unconfigured' };

/** @deprecated Prefer ApiAuthResult.status — kept for narrow status comparisons in tests. */
export type ApiAuthStatus = ApiAuthResult['status'];

/**
 * Verifies the caller's Supabase access token against the Auth API. These
 * server routes perform paid work (OpenAI/TMDB) and act as outbound fetchers,
 * so they must never run for anonymous internet clients on a live deployment.
 */
export async function authenticateApiRequest(request: Request): Promise<ApiAuthResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const apikey = process.env.SUPABASE_PUBLISHABLE_KEY;
  // Without backend Supabase configuration the token cannot be verified.
  // Callers must opt in via ALLOW_UNAUTHENTICATED_API for local-only use.
  if (!supabaseUrl || !apikey) return { status: 'unconfigured' };

  const authorization = request.headers.get('authorization');
  if (!authorization) return { status: 'unauthenticated' };

  try {
    const response = await guardedFetch(
      'supabase-auth',
      `${supabaseUrl}/auth/v1/user`,
      { headers: { Authorization: authorization, apikey } },
      { timeoutMs: 8_000, maxConcurrency: 8 },
    );
    if (!response.ok) return { status: 'unauthenticated' };
    const user = (await response.json()) as { id?: string };
    return user?.id ? { status: 'ok', userId: user.id } : { status: 'unauthenticated' };
  } catch {
    return { status: 'unauthenticated' };
  }
}

/**
 * Blocks when there is no verified user. Unconfigured Supabase is allowed only
 * when ALLOW_UNAUTHENTICATED_API=true so local hosts can opt in explicitly
 * instead of failing open whenever NODE_ENV is not production.
 */
export function isApiRequestBlocked(result: ApiAuthResult): boolean {
  if (result.status === 'ok') return false;
  if (result.status === 'unauthenticated') return true;
  return process.env.ALLOW_UNAUTHENTICATED_API !== 'true';
}

/** Stable subject key for per-user rate limits (falls back for local opt-in). */
export function apiRateLimitSubject(request: Request, result: ApiAuthResult): string {
  if (result.status === 'ok') return result.userId;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `anon:${forwarded || 'local'}`;
}
