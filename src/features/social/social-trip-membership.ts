import type { TravelPlan } from '@/features/travel/types';
import { isTravelMemberPlan } from '@/features/travel/trip-roster';
import type { FriendProfile } from '@/services/friends';

export type SocialTripMembership = {
  plan: TravelPlan;
  status: 'member' | 'invited';
};

function key(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

/**
 * Match a friend to canonical trip participants by email, with a narrow name
 * fallback for member copies where the friend is represented as the host.
 */
export function socialTripMemberships(
  friend: Pick<FriendProfile, 'displayName' | 'email'>,
  plans: TravelPlan[],
): SocialTripMembership[] {
  const friendEmail = key(friend.email);
  const friendName = key(friend.displayName);

  return plans.flatMap((plan) => {
    const participant = plan.participants.find(
      (person) => friendEmail && key(person.email) === friendEmail,
    );
    if (participant) {
      return [{ plan, status: participant.acceptedAt ? 'member' : 'invited' } as const];
    }

    // A joined member copy stores the remote host by name, not participant email.
    if (isTravelMemberPlan(plan) && friendName && key(plan.hostDisplayName) === friendName) {
      return [{ plan, status: 'member' } as const];
    }

    return [];
  });
}
