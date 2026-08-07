import { travelInviteLocalId } from '@/features/travel/travel-invite-codec';
import type { TravelPlan } from '@/features/travel/types';
import { markInviteSnapshotItinerary } from '@/services/travel/itinerary-collaboration';

/**
 * Merge an approved open-join resolution into an existing local plan.
 * Member copies must drop the host's open-join capability, while the actual
 * host keeps it when opening their own link.
 */
export function mergeResolvedTravelOpenJoinPlan(
  existing: TravelPlan,
  input: {
    status: 'approved' | 'host';
    tripId: string;
    chatAccessCode?: string;
    hostDisplayName?: string;
    updatedAt: string;
  },
): TravelPlan {
  return {
    ...existing,
    ...(input.status === 'approved' ? { openJoinCode: undefined } : {}),
    ...(input.chatAccessCode ? { chatAccessCode: input.chatAccessCode } : {}),
    ...(input.status === 'approved' && input.hostDisplayName?.trim()
      ? { hostDisplayName: input.hostDisplayName.trim() }
      : {}),
    hostTripId: input.tripId,
    updatedAt: input.updatedAt,
  };
}

/** True when this local plan is a host roster (open-join, not a member copy). */
export function isLocalTravelHostPlan(
  plan: Pick<TravelPlan, 'openJoinCode' | 'chatAccessCode'>,
): boolean {
  return Boolean(plan.openJoinCode) && !plan.chatAccessCode;
}

/**
 * Pick the local plan to update after open-join resolve.
 * Approved members never merge into another trip's host plan — that left the
 * friend looking like a sole host of their own Iceland copy with no Farhana.
 */
export function findExistingOpenJoinPlan(
  plans: TravelPlan[],
  input: {
    status: 'approved' | 'host';
    tripId: string;
    openJoinCode: string;
    chatAccessCode?: string;
  },
): TravelPlan | undefined {
  if (input.status === 'host') {
    return (
      plans.find((plan) => plan.id === input.tripId) ??
      plans.find((plan) => plan.id === travelInviteLocalId(input.openJoinCode))
    );
  }

  if (!input.chatAccessCode) return undefined;

  const byChat =
    plans.find((plan) => plan.chatAccessCode === input.chatAccessCode) ??
    plans.find((plan) => plan.id === travelInviteLocalId(input.chatAccessCode!));
  if (byChat) return byChat;

  const byOpenJoinId = plans.find(
    (plan) => plan.id === travelInviteLocalId(input.openJoinCode),
  );
  if (!byOpenJoinId) return undefined;
  // Never convert a distinct host plan into a member copy of another trip.
  if (
    isLocalTravelHostPlan(byOpenJoinId) &&
    byOpenJoinId.id !== input.tripId
  ) {
    return undefined;
  }
  return byOpenJoinId;
}

export function buildOpenJoinMemberPlan(input: {
  resolvedPlan: Omit<TravelPlan, 'id' | 'createdAt' | 'updatedAt'>;
  tripId: string;
  chatAccessCode: string;
  hostDisplayName?: string;
  hostUserId?: string;
  now: string;
}): TravelPlan {
  return {
    ...input.resolvedPlan,
    id: travelInviteLocalId(input.chatAccessCode),
    chatAccessCode: input.chatAccessCode,
    hostTripId: input.tripId,
    itinerary: markInviteSnapshotItinerary(
      input.resolvedPlan.itinerary,
      input.hostUserId ?? 'host',
    ),
    ...(input.hostDisplayName?.trim()
      ? { hostDisplayName: input.hostDisplayName.trim() }
      : {}),
    openJoinCode: undefined,
    createdAt: input.now,
    updatedAt: input.now,
  };
}
