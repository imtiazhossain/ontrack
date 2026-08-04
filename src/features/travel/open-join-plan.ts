import type { TravelPlan } from '@/features/travel/types';

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
    updatedAt: string;
  },
): TravelPlan {
  return {
    ...existing,
    ...(input.status === 'approved' ? { openJoinCode: undefined } : {}),
    ...(input.chatAccessCode ? { chatAccessCode: input.chatAccessCode } : {}),
    hostTripId: input.tripId,
    updatedAt: input.updatedAt,
  };
}
