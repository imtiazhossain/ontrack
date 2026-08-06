import { getSupabaseClient } from '@/services/cloud/supabase';
import {
  pendingUploadDelta,
  useUsageAnalytics,
  type UsageDayRollup,
} from '@/store/usage-analytics';
import { toDateKey } from '@/utils/date';

export type ProductAnalyticsSummary = {
  windowDays: number;
  sinceDay: string;
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalActiveMs: number;
  topSurfaces: { surface: string; activeMs: number }[];
};

function surfacesToJson(surfaces: UsageDayRollup['surfaces']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(surfaces)) {
    if (typeof value === 'number' && value > 0) out[key] = Math.round(value);
  }
  return out;
}

/** Push pending local rollups for recent days (signed-in only). */
export async function flushUsageAnalytics(daysBack = 7): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) return 0;

  const state = useUsageAnalytics.getState();
  const end = new Date();
  let uploaded = 0;
  for (let i = 0; i < daysBack; i += 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = toDateKey(d);
    const day = state.days[key];
    if (!day) continue;
    const delta = pendingUploadDelta(day);
    if (!delta) continue;
    const { error } = await client.rpc('upsert_analytics_daily', {
      p_day: delta.day,
      p_session_count: delta.sessionCount,
      p_active_ms: delta.activeMs,
      p_surfaces: surfacesToJson(delta.surfaces),
    });
    if (error) throw error;
    useUsageAnalytics.getState().markUploaded(delta.day, delta);
    uploaded += 1;
  }
  return uploaded;
}

export async function fetchProductAnalyticsSummary(
  days = 7,
): Promise<ProductAnalyticsSummary | { error: string }> {
  const client = getSupabaseClient();
  if (!client) return { error: 'Cloud is not configured.' };
  const { data, error } = await client.rpc('analytics_product_summary', {
    p_days: days,
  });
  if (error) {
    if (/not authorized/i.test(error.message)) {
      return { error: 'Product-wide stats are only available to the analytics admin account.' };
    }
    return { error: error.message };
  }
  const body = data as Partial<ProductAnalyticsSummary> | null;
  if (!body || typeof body !== 'object') return { error: 'Empty summary.' };
  return {
    windowDays: Number(body.windowDays) || days,
    sinceDay: String(body.sinceDay ?? ''),
    totalUsers: Number(body.totalUsers) || 0,
    activeUsers: Number(body.activeUsers) || 0,
    totalSessions: Number(body.totalSessions) || 0,
    totalActiveMs: Number(body.totalActiveMs) || 0,
    topSurfaces: Array.isArray(body.topSurfaces)
      ? body.topSurfaces.map((row) => ({
          surface: String((row as { surface?: string }).surface ?? 'other'),
          activeMs: Number((row as { activeMs?: number }).activeMs) || 0,
        }))
      : [],
  };
}
