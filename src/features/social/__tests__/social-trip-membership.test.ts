import { socialTripMemberships } from '@/features/social/social-trip-membership';
import type { TravelPlan } from '@/features/travel/types';
import type { FriendProfile } from '@/services/friends';

const friend: FriendProfile = {
  userId: 'farhana',
  displayName: 'Farhana Tasmin',
  email: 'ftasmin1126@msn.com',
  avatar: { kind: 'initials', color: '#2E7D5A' },
};

function plan(overrides: Partial<TravelPlan> = {}): TravelPlan {
  return {
    id: 'trip-iceland',
    title: 'Iceland',
    destination: 'Iceland',
    startDate: '2026-08-20',
    endDate: '2026-08-27',
    itinerary: [],
    participants: [],
    baseCurrency: 'USD',
    expenses: [],
    createdAt: '2026-07-20T12:00:00.000Z',
    updatedAt: '2026-08-02T15:22:07.010Z',
    ...overrides,
  };
}

describe('social trip membership', () => {
  it('recognizes an accepted trip participant by normalized email', () => {
    const iceland = plan({
      participants: [
        {
          id: 'participant-farhana',
          name: 'Farhana Tasmin',
          email: ' FTASMIN1126@MSN.COM ',
          inviteCode: 'invite-farhana',
          invitedAt: '2026-08-01T12:00:00.000Z',
          acceptedAt: '2026-08-02T15:22:07.010Z',
        },
      ],
    });

    expect(socialTripMemberships(friend, [iceland])).toEqual([
      { plan: iceland, status: 'member' },
    ]);
  });

  it('keeps an unaccepted participant labeled as invited', () => {
    const iceland = plan({
      participants: [
        {
          id: 'participant-farhana',
          name: 'Farhana Tasmin',
          email: friend.email,
          inviteCode: 'invite-farhana',
          invitedAt: '2026-08-01T12:00:00.000Z',
        },
      ],
    });

    expect(socialTripMemberships(friend, [iceland])).toEqual([
      { plan: iceland, status: 'invited' },
    ]);
  });

  it('recognizes the host on a joined member copy by host display name', () => {
    const hostTrip = plan({
      id: 'trip-local-copy',
      hostTripId: 'trip-host-iceland',
      hostDisplayName: ' FARHANA TASMIN ',
    });

    expect(socialTripMemberships(friend, [hostTrip])).toEqual([
      { plan: hostTrip, status: 'member' },
    ]);
  });

  it('does not use a host-name fallback on the canonical host plan', () => {
    const unrelatedTrip = plan({
      hostTripId: 'trip-iceland',
      hostDisplayName: friend.displayName,
    });

    expect(socialTripMemberships(friend, [unrelatedTrip])).toEqual([]);
  });
});
