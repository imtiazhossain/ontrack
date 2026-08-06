import {
  buildOpenJoinMemberPlan,
  findExistingOpenJoinPlan,
  mergeResolvedTravelOpenJoinPlan,
} from '@/features/travel/open-join-plan';
import type { TravelPlan } from '@/features/travel/types';

const existing: TravelPlan = {
  id: 'trip-invite-member-code',
  title: 'Iceland',
  destination: 'Iceland',
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  itinerary: [],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  openJoinCode: '11111111111111111111',
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
};

describe('open-join local plan merge', () => {
  it('clears stale host link state from an approved member copy', () => {
    expect(
      mergeResolvedTravelOpenJoinPlan(existing, {
        status: 'approved',
        tripId: 'trip-host-1',
        chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
        hostDisplayName: 'Alex Rivera',
        updatedAt: '2026-08-04T12:00:00.000Z',
      }),
    ).toMatchObject({
      id: existing.id,
      openJoinCode: undefined,
      chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
      hostTripId: 'trip-host-1',
      hostDisplayName: 'Alex Rivera',
      updatedAt: '2026-08-04T12:00:00.000Z',
    });
  });

  it('preserves the open-join link for the actual host', () => {
    expect(
      mergeResolvedTravelOpenJoinPlan(existing, {
        status: 'host',
        tripId: existing.id,
        updatedAt: '2026-08-04T12:00:00.000Z',
      }).openJoinCode,
    ).toBe(existing.openJoinCode);
  });

  it('does not merge an approved join into another trip’s host plan', () => {
    const hostPlan: TravelPlan = {
      ...existing,
      id: 'trip-my-iceland',
      openJoinCode: 'bbbbbbbbbbbbbbbbbbbb',
    };
    expect(
      findExistingOpenJoinPlan([hostPlan], {
        status: 'approved',
        tripId: 'trip-host-1',
        openJoinCode: 'cccccccccccccccccccc',
        chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
      }),
    ).toBeUndefined();
  });

  it('builds a member copy with host display name and chat access', () => {
    expect(
      buildOpenJoinMemberPlan({
        resolvedPlan: {
          title: 'Iceland',
          destination: 'Reykjavík, Iceland',
          startDate: '2026-09-08',
          endDate: '2026-09-14',
          itinerary: [],
          participants: [],
          baseCurrency: 'USD',
          expenses: [],
        },
        tripId: 'trip-host-1',
        chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
        hostDisplayName: 'Alex Rivera',
        now: '2026-08-06T15:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'trip-invite-aaaaaaaaaaaaaaaaaaaa',
      chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
      hostTripId: 'trip-host-1',
      hostDisplayName: 'Alex Rivera',
      openJoinCode: undefined,
    });
  });
});
