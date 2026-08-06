import { useAccountFlags } from '@/store/account-flags';

import { getSupabaseClient } from './supabase';

/**
 * Load privilege flags for the signed-in user from `public.account_flags`.
 * Missing rows mean no privileges (fail closed).
 */
export async function loadAccountFlags(userId: string): Promise<void> {
  useAccountFlags.getState().setLoading();
  const client = getSupabaseClient();
  if (!client) {
    useAccountFlags.getState().replaceFlags({
      developerTools: false,
      analyticsAdmin: false,
    });
    return;
  }

  const { data, error } = await client
    .from('account_flags')
    .select('developer_tools, analytics_admin')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    useAccountFlags.getState().replaceFlags({
      developerTools: false,
      analyticsAdmin: false,
    });
    return;
  }

  useAccountFlags.getState().replaceFlags({
    developerTools: data.developer_tools === true,
    analyticsAdmin: data.analytics_admin === true,
  });
}
