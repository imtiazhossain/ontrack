import { mergeResolvedTravelOpenJoinPlan } from '@/features/travel/open-join-plan';
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
        updatedAt: '2026-08-04T12:00:00.000Z',
      }),
    ).toMatchObject({
      id: existing.id,
      openJoinCode: undefined,
      chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
      hostTripId: 'trip-host-1',
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
});
