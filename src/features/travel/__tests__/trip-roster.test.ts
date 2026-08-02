import {
  canonicalTravelTripId,
  isTravelMemberPlan,
} from '@/features/travel/trip-roster';
import type { TravelPlan } from '@/features/travel/types';

describe('trip roster helpers', () => {
  const base: Pick<TravelPlan, 'id' | 'hostTripId' | 'chatAccessCode'> = {
    id: 'trip-local-1',
  };

  it('uses hostTripId when present for canonical trip id', () => {
    expect(canonicalTravelTripId(base)).toBe('trip-local-1');
    expect(
      canonicalTravelTripId({ ...base, hostTripId: 'trip-host-9' }),
    ).toBe('trip-host-9');
  });

  it('detects member copies from chatAccessCode or a distinct hostTripId', () => {
    expect(isTravelMemberPlan(base)).toBe(false);
    expect(isTravelMemberPlan({ ...base, chatAccessCode: 'abc' })).toBe(true);
    expect(
      isTravelMemberPlan({ ...base, hostTripId: 'trip-host-9' }),
    ).toBe(true);
    expect(
      isTravelMemberPlan({ ...base, hostTripId: 'trip-local-1' }),
    ).toBe(false);
  });
});
