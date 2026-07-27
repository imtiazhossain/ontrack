import { decodeTravelInvite, encodeTravelInvite, travelInviteKey } from '../share';
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

  it('accepts the decoded value supplied by a router', () => {
    const decodedByRouter = decodeURIComponent(encodeTravelInvite(plan));
    expect(decodeTravelInvite(decodedByRouter)?.destination).toBe('Montréal');
  });

  it('rejects malformed invites', () => {
    expect(decodeTravelInvite('not-a-trip')).toBeUndefined();
  });

  it('creates stable keys for duplicate invite protection', () => {
    const payload = encodeTravelInvite(plan);
    expect(travelInviteKey(payload)).toBe(travelInviteKey(payload));
    expect(travelInviteKey(`${payload}x`)).not.toBe(travelInviteKey(payload));
  });
});
