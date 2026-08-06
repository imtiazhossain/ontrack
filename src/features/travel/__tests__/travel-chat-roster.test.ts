import {
  matchTravelChatAccessCapability,
  planPatchFromTravelChatCapability,
  planPatchFromTravelChatRoster,
  resolveTravelChatAccessFromRoster,
  resolveTravelChatMembersFromRoster,
} from '@/features/travel/travel-chat-roster';
import type { TravelPlan, TravelTripRosterPerson } from '@/features/travel/types';

const basePlan: TravelPlan = {
  id: 'trip-1',
  title: 'Iceland',
  destination: 'Reykjavík',
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  itinerary: [],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
};

const host: TravelTripRosterPerson = {
  userId: 'user-host',
  displayName: 'Alex Rivera',
  role: 'host',
  avatarKind: 'icon',
  avatarIconId: 'plane',
};

const member: TravelTripRosterPerson = {
  userId: 'user-member',
  displayName: 'Jordan Lee',
  role: 'member',
  inviteCode: 'bbbbbbbbbbbbbbbbbbbb',
  acceptedAt: '2026-08-02T12:00:00.000Z',
  email: 'jordan@example.com',
  avatarKind: 'icon',
  avatarIconId: 'globe',
};

describe('resolveTravelChatAccessFromRoster', () => {
  it('keeps an existing local chat capability', () => {
    expect(
      resolveTravelChatAccessFromRoster({
        plan: { ...basePlan, chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa' },
        roster: [host, member],
        selfUserId: 'user-member',
      }),
    ).toBe('aaaaaaaaaaaaaaaaaaaa');
  });

  it('recovers a member invite code when chatAccessCode was lost', () => {
    expect(
      resolveTravelChatAccessFromRoster({
        plan: {
          ...basePlan,
          hostTripId: 'trip-host',
          hostDisplayName: 'Alex Rivera',
        },
        roster: [host, member],
        selfUserId: 'user-member',
      }),
    ).toBe('bbbbbbbbbbbbbbbbbbbb');
  });

  it('unlocks host chat from an accepted roster invite', () => {
    expect(
      resolveTravelChatAccessFromRoster({
        plan: basePlan,
        roster: [host, member],
        selfUserId: 'user-host',
      }),
    ).toBe('bbbbbbbbbbbbbbbbbbbb');
  });

  it('stays locked when this account is missing from the roster', () => {
    expect(
      resolveTravelChatAccessFromRoster({
        plan: basePlan,
        roster: [host, member],
        selfUserId: 'user-other',
      }),
    ).toBeUndefined();
  });
});

describe('resolveTravelChatMembersFromRoster', () => {
  it('puts self first and attaches auth user ids for avatars', () => {
    expect(
      resolveTravelChatMembersFromRoster({
        roster: [host, member],
        selfUserId: 'user-member',
        selfDisplayName: 'Jordan Lee',
        fallback: [],
      }),
    ).toEqual([
      {
        id: 'user-member',
        name: 'Jordan Lee',
        userId: 'user-member',
        isSelf: true,
      },
      {
        id: 'user-host',
        name: 'Alex Rivera',
        userId: 'user-host',
        isSelf: false,
      },
    ]);
  });
});

describe('planPatchFromTravelChatRoster', () => {
  it('restores chatAccessCode on member copies only', () => {
    const patched = planPatchFromTravelChatRoster({
      plan: {
        ...basePlan,
        hostTripId: 'trip-host',
        hostDisplayName: 'Alex',
      },
      roster: [host, member],
      selfUserId: 'user-member',
      accessCode: 'bbbbbbbbbbbbbbbbbbbb',
    });
    expect(patched?.chatAccessCode).toBe('bbbbbbbbbbbbbbbbbbbb');
    expect(patched?.hostDisplayName).toBe('Alex Rivera');
  });

  it('writes accepted participants for hosts without tagging them as members', () => {
    const patched = planPatchFromTravelChatRoster({
      plan: basePlan,
      roster: [host, member],
      selfUserId: 'user-host',
      accessCode: 'bbbbbbbbbbbbbbbbbbbb',
    });
    expect(patched?.chatAccessCode).toBeUndefined();
    expect(patched?.participants).toEqual([
      expect.objectContaining({
        name: 'Jordan Lee',
        inviteCode: 'bbbbbbbbbbbbbbbbbbbb',
        acceptedAt: '2026-08-02T12:00:00.000Z',
        email: 'jordan@example.com',
      }),
    ]);
  });
});

describe('matchTravelChatAccessCapability', () => {
  const memberCap = {
    tripId: 'trip-shared',
    accessCode: 'cccccccccccccccccccc',
    role: 'member' as const,
    title: 'Iceland',
    destination: 'Reykjavík',
    startDate: '2026-09-08',
    endDate: '2026-09-14',
  };
  const hostForkCap = {
    tripId: 'trip-invite-fork',
    accessCode: 'dddddddddddddddddddd',
    role: 'host' as const,
    title: 'Iceland',
    destination: 'Reykjavík',
    startDate: '2026-09-08',
    endDate: '2026-09-14',
  };

  it('prefers an accepted membership over a same-titled host fork', () => {
    expect(
      matchTravelChatAccessCapability(
        {
          id: 'trip-invite-fork',
          title: 'Iceland',
          startDate: '2026-09-08',
          endDate: '2026-09-14',
        },
        [hostForkCap, memberCap],
      ),
    ).toEqual(memberCap);
  });
});

describe('planPatchFromTravelChatCapability', () => {
  it('rewires a forked local plan onto the shared member trip', () => {
    const patched = planPatchFromTravelChatCapability({
      plan: {
        ...basePlan,
        id: 'trip-invite-fork',
        openJoinCode: 'eeeeeeeeeeeeeeeeeeee',
      },
      capability: {
        tripId: 'trip-shared',
        accessCode: 'cccccccccccccccccccc',
        role: 'member',
        title: 'Iceland',
        destination: 'Reykjavík',
        startDate: '2026-09-08',
        endDate: '2026-09-14',
      },
    });
    expect(patched).toMatchObject({
      chatAccessCode: 'cccccccccccccccccccc',
      hostTripId: 'trip-shared',
    });
    expect(patched?.openJoinCode).toBeUndefined();
  });
});
