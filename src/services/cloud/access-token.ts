import { getSupabaseClient } from './supabase';

/** Current Supabase access token, if a session exists. */
export async function getAccessToken(): Promise<string | undefined> {
  const client = getSupabaseClient();
  if (!client) return undefined;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? undefined;
}

/**
 * Authorization header for calls to the app's own server routes, which now
 * require a valid Supabase session before doing paid AI/fetch work.
 */
export async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
