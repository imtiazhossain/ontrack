import {
  canonicalTravelTripId,
  isTravelMemberPlan,
  resolveIsTravelSoleHost,
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

  it('never treats a member copy as sole host before roster loads', () => {
    expect(
      resolveIsTravelSoleHost({ myRosterRole: undefined, memberPlan: true }),
    ).toBe(false);
    expect(
      resolveIsTravelSoleHost({ myRosterRole: 'member', memberPlan: true }),
    ).toBe(false);
    expect(
      resolveIsTravelSoleHost({ myRosterRole: 'cohost', memberPlan: true }),
    ).toBe(false);
    expect(
      resolveIsTravelSoleHost({ myRosterRole: 'host', memberPlan: true }),
    ).toBe(true);
  });

  it('assumes sole host on local host plans until roster says otherwise', () => {
    expect(
      resolveIsTravelSoleHost({ myRosterRole: undefined, memberPlan: false }),
    ).toBe(true);
    expect(
      resolveIsTravelSoleHost({ myRosterRole: 'member', memberPlan: false }),
    ).toBe(false);
  });
});
