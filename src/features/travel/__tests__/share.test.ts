import {
  createTravelInviteUrl,
  createInstalledTravelInviteUrl,
  decodeTravelInvite,
  encodeTravelInvite,
  findMatchingTravelPlan,
  isShortTravelInvite,
  travelPlanIdentityKey,
  travelInviteKey,
} from '../share';
import type { TravelPlan } from '../types';

const plan: TravelPlan = {
  id: 'trip-1',
  title: 'Amélie’s 50% fun trip',
  destination: 'Montréal',
  startDate: '2026-09-12',
  endDate: '2026-09-15',
  notes: 'Bring friends ✈️',
  itinerary: [
    {
      id: 'flight-1',
      kind: 'flight',
      title: 'Flight to Montréal',
      date: '2026-09-12',
      startMinutes: 540,
      durationMinutes: 90,
      flight: {
        airline: 'Air Canada',
        flightNumber: 'AC 421',
        confirmationCode: 'ABC123',
        departureAirport: 'JFK',
        arrivalAirport: 'YUL',
        seat: '14A',
      },
    },
  ],
  createdAt: '2026-07-25T12:00:00.000Z',
  updatedAt: '2026-07-25T12:00:00.000Z',
};

describe('travel invites', () => {
  it('round-trips an encoded trip without copying its local id', () => {
    expect(decodeTravelInvite(encodeTravelInvite(plan))).toEqual({
      title: plan.title,
      destination: plan.destination,
      startDate: plan.startDate,
      endDate: plan.endDate,
      notes: plan.notes,
      itinerary: plan.itinerary,
    });
  });

  it('creates one compact, URL-safe payload instead of double-encoded JSON', () => {
    const payload = encodeTravelInvite(plan);
    expect(payload).toMatch(/^2\.[A-Za-z0-9_-]+$/);
  });

  it('creates a genuinely short hosted link from an invite code', () => {
    const code = '0123456789abcdefabcd';
    const url = createTravelInviteUrl(code, 'https://ontrack--links.expo.app/');
    expect(url).toBe(`https://ontrack--links.expo.app/i/${code}`);
    expect(url.length).toBeLessThan(70);
    expect(isShortTravelInvite(`s.${code}`)).toBe(true);
    expect(isShortTravelInvite(`s.${code}x`)).toBe(false);
  });

  it('creates an explicit installed-app URL without resolving back to the website', () => {
    const code = '0123456789abcdefabcd';
    expect(createInstalledTravelInviteUrl(`s.${code}`)).toBe(`ontrack:///i/${code}`);
    expect(createInstalledTravelInviteUrl()).toBe('ontrack:///travel');
  });

  it('keeps links from the original invite format working', () => {
    const legacyPayload = encodeURIComponent(
      JSON.stringify({
        version: 1,
        plan: { ...plan, id: undefined, createdAt: undefined, updatedAt: undefined },
      }),
    );
    expect(decodeTravelInvite(legacyPayload)?.destination).toBe('Montréal');
    expect(decodeTravelInvite(decodeURIComponent(legacyPayload))?.destination).toBe('Montréal');
  });

  it('rejects malformed invites', () => {
    expect(decodeTravelInvite('not-a-trip')).toBeUndefined();
  });

  it('creates stable keys for duplicate invite protection', () => {
    const payload = encodeTravelInvite(plan);
    expect(travelInviteKey(payload)).toBe(travelInviteKey(payload));
    expect(travelInviteKey(`${payload}x`)).not.toBe(travelInviteKey(payload));
  });

  it('matches an existing trip by normalized title, destination, and dates', () => {
    expect(
      findMatchingTravelPlan([plan], {
        ...plan,
        title: '  AMÉLIE’S   50% FUN TRIP ',
        destination: ' montréal ',
      }),
    ).toBe(plan);
  });

  it('does not match a trip with different dates', () => {
    expect(
      findMatchingTravelPlan([plan], {
        ...plan,
        startDate: '2026-09-13',
      }),
    ).toBeUndefined();
  });

  it('uses the same imported id for different links containing the same trip', () => {
    const sameTripWithUpdatedDetails: TravelPlan = {
      ...plan,
      id: 'another-local-id',
      notes: 'Updated packing notes',
      itinerary: [],
    };
    expect(travelPlanIdentityKey(sameTripWithUpdatedDetails)).toBe(
      travelPlanIdentityKey(plan),
    );
  });
});
