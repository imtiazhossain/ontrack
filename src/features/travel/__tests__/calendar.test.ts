import { isTravelPlanOnCalendar, travelCalendarDrafts } from '../calendar';
import type { TravelPlan } from '../types';

const PLAN: TravelPlan = {
  id: 'trip-1',
  title: 'Lisbon weekend',
  destination: 'Lisbon',
  startDate: '2026-09-04',
  endDate: '2026-09-07',
  itinerary: [
    {
      id: 'item-1',
      kind: 'flight',
      title: 'Flight to Lisbon',
      date: '2026-09-04',
      startMinutes: 480,
      durationMinutes: 420,
      details: 'Meet at Terminal 4',
      flight: {
        airline: 'TAP Air Portugal',
        flightNumber: 'TP 202',
        confirmationCode: 'LIS123',
        departureAirport: 'EWR',
        arrivalAirport: 'LIS',
        seat: '12A',
      },
    },
  ],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
};

describe('travel calendar adapter', () => {
  it('detects whether a trip has already been added to Calendar', () => {
    const activities = [
      { travelPlanId: 'trip-1' },
      { travelPlanId: undefined },
    ];

    expect(isTravelPlanOnCalendar(activities, 'trip-1')).toBe(true);
    expect(isTravelPlanOnCalendar(activities, 'trip-2')).toBe(false);
  });

  it('creates a trip event for every day and every itinerary event', () => {
    const drafts = travelCalendarDrafts(PLAN);
    const tripDays = drafts.filter((draft) => !draft.travelItemId);

    expect(tripDays).toEqual([
      expect.objectContaining({ date: '2026-09-04', title: '✈️ Day 1 · Lisbon weekend' }),
      expect.objectContaining({ date: '2026-09-05', title: '✈️ Day 2 · Lisbon weekend' }),
      expect.objectContaining({ date: '2026-09-06', title: '✈️ Day 3 · Lisbon weekend' }),
      expect.objectContaining({ date: '2026-09-07', title: '✈️ Day 4 · Lisbon weekend' }),
    ]);
    expect(drafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: '✈️ Day 1 · Lisbon weekend',
          date: '2026-09-04',
          travelPlanId: PLAN.id,
        }),
        expect.objectContaining({
          title: '✈️ Flight to Lisbon',
          date: '2026-09-04',
          travelPlanId: PLAN.id,
          travelItemId: 'item-1',
        }),
      ]),
    );
    expect(drafts.find((draft) => draft.travelItemId === 'item-1')?.notes).toContain(
      'Confirmation: LIS123',
    );
    expect(drafts).toHaveLength(5);
  });

  it('skips moment itinerary items when building calendar drafts', () => {
    const drafts = travelCalendarDrafts({
      ...PLAN,
      itinerary: [
        ...PLAN.itinerary,
        {
          id: 'moment-1',
          kind: 'moment',
          title: 'Waterfall selfie',
          date: '2026-09-05',
          startMinutes: 900,
          durationMinutes: 15,
          details: 'Blue mist',
          photoUris: ['file:///Documents/travel-moments/a.jpg'],
        },
      ],
    });

    expect(drafts.find((draft) => draft.travelItemId === 'moment-1')).toBeUndefined();
    expect(drafts).toHaveLength(5);
  });

  it('uses the trip mode and exports transport departure, stop, and arrival markers', () => {
    const drafts = travelCalendarDrafts({
      ...PLAN,
      mode: 'road',
      origin: 'New York',
      itinerary: [{
        id: 'road-1',
        kind: 'transport',
        title: 'Drive south',
        date: '2026-09-04',
        startMinutes: 8 * 60,
        durationMinutes: 8 * 60,
        transport: {
          mode: 'driving',
          origin: 'New York',
          destination: 'Washington',
          arrivalDate: '2026-09-04',
          arrivalMinutes: 16 * 60,
          stops: [{
            id: 'stop-1',
            name: 'Philadelphia',
            arrivalDate: '2026-09-04',
            arrivalMinutes: 11 * 60,
          }],
        },
      }],
    });
    expect(drafts[0]?.title).toBe('🚗 Day 1 · Lisbon weekend');
    expect(drafts.filter((draft) => draft.travelItemId === 'road-1').map((draft) => draft.title)).toEqual([
      '🚗 Depart · Drive south',
      '📍 Stop · Philadelphia',
      '🚗 Arrive · Washington',
    ]);
  });
});
