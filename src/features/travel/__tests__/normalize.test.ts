import { normalizeTravelPlan, normalizeTravelPlans } from '../normalize';

describe('travel plan normalization', () => {
  const legacyPlan = {
    id: 'trip-legacy',
    title: 'Iceland',
    destination: 'Iceland',
    startDate: '2026-09-08',
    endDate: '2026-09-13',
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-02T12:00:00.000Z',
  };

  it('migrates legacy trips without an itinerary to an empty itinerary', () => {
    expect(normalizeTravelPlan(legacyPlan)).toEqual({
      ...legacyPlan,
      notes: undefined,
      itinerary: [],
    });
  });

  it('removes malformed itinerary entries without discarding the trip', () => {
    expect(
      normalizeTravelPlan({
        ...legacyPlan,
        itinerary: [
          undefined,
          { id: 'broken' },
          {
            id: 'dinner',
            kind: 'activity',
            title: 'Dinner',
            date: '2026-09-09',
            startMinutes: 1140,
            durationMinutes: 90,
          },
        ],
      })?.itinerary,
    ).toEqual([
      {
        id: 'dinner',
        kind: 'activity',
        title: 'Dinner',
        date: '2026-09-09',
        startMinutes: 1140,
        durationMinutes: 90,
        details: undefined,
        bookingUrl: undefined,
        flight: undefined,
      },
    ]);
  });

  it('ignores invalid cloud records', () => {
    expect(normalizeTravelPlans([legacyPlan, null, { title: 'Missing ID' }])).toHaveLength(1);
  });
});
