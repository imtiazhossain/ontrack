import type { SupabaseClient } from '@supabase/supabase-js';

import { travelChatAccessCode } from '@/features/travel/chat';
import {
  canonicalTravelTripId,
  isTravelMemberPlan,
} from '@/features/travel/trip-roster';
import type { TravelPlan } from '@/features/travel/types';
import { getSupabaseClient } from '@/services/cloud/supabase';

export function collaborationMessageFrom(
  error: { message?: string } | null,
  fallback: string,
): string {
  return error?.message?.trim() || fallback;
}

export function shouldSyncTravelCollaboration(plan: TravelPlan): boolean {
  return Boolean(
    plan.participants.length > 0 ||
      plan.chatAccessCode ||
      plan.openJoinCode ||
      plan.hostTripId,
  );
}

/** Host trip id for shared RPCs; undefined until a member copy can resolve via access. */
export function sharedTravelTripId(plan: TravelPlan): string | undefined {
  if (plan.hostTripId?.trim()) return plan.hostTripId.trim();
  if (!isTravelMemberPlan(plan)) return canonicalTravelTripId(plan);
  return undefined;
}

type CollaborationAuthError = new (message: string) => Error;

export async function authenticatedTravelCollaborationClient(
  ErrorClass: CollaborationAuthError,
  messages: { unconfigured: string; unsignedIn: string },
): Promise<{
  client: SupabaseClient;
  userId: string;
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };
}> {
  const client = getSupabaseClient();
  if (!client) {
    throw new ErrorClass(messages.unconfigured);
  }
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    throw new ErrorClass(messages.unsignedIn);
  }
  return {
    client,
    userId: data.session.user.id,
    user: data.session.user,
  };
}

type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

/**
 * Member plans prefer access-code fetch; hosts/canonical ids use trip id.
 * Falls back to access when trip id is not yet known.
 */
export async function fetchTravelTripRpc(input: {
  client: SupabaseClient;
  plan: TravelPlan;
  tripId: string | undefined;
  byTrip: (tripId: string) => PromiseLike<RpcResult>;
  byAccess: (accessCode: string) => PromiseLike<RpcResult>;
}): Promise<RpcResult | undefined> {
  const access = travelChatAccessCode(input.plan);
  if (access && isTravelMemberPlan(input.plan)) {
    return input.byAccess(access);
  }
  if (input.tripId) {
    return input.byTrip(input.tripId);
  }
  if (access) {
    return input.byAccess(access);
  }
  return undefined;
}
