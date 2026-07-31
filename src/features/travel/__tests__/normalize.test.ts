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
      participants: [],
      baseCurrency: 'USD',
      expenses: [],
    });
  });

  it('keeps valid expenses and drops malformed ones', () => {
    expect(
      normalizeTravelPlan({
        ...legacyPlan,
        baseCurrency: 'eur',
        expenses: [
          {
            id: 'expense-1',
            title: 'Dinner',
            amount: 4500,
            currency: 'isk',
            date: '2026-09-09',
            category: 'food',
            paidById: 'self',
            splitWithIds: ['self'],
            createdAt: '2026-07-01T12:00:00.000Z',
            updatedAt: '2026-07-01T12:00:00.000Z',
          },
          { id: 'broken', amount: -1 },
        ],
      }),
    ).toMatchObject({
      baseCurrency: 'EUR',
      expenses: [
        {
          id: 'expense-1',
          title: 'Dinner',
          amount: 4500,
          currency: 'ISK',
          category: 'food',
          paidById: 'self',
          splitWithIds: ['self'],
        },
      ],
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

  it('repairs the previously persisted Icelandair return flight import', () => {
    const normalized = normalizeTravelPlan({
      ...legacyPlan,
      startDate: '2026-09-08',
      endDate: '2026-09-13',
      itinerary: [
        {
          id: 'outbound',
          kind: 'flight',
          title: 'Flight EWR → KEF',
          date: '2026-09-08',
          startMinutes: 20 * 60 + 25,
          durationMinutes: 5 * 60 + 50,
          flight: {
            airline: 'Icelandair',
            flightNumber: 'FI 622',
            confirmationCode: 'AB2ZQV',
            departureAirport: 'EWR',
            arrivalAirport: 'KEF',
          },
        },
        {
          id: 'return',
          kind: 'flight',
          title: 'Flight EWR → KEF',
          date: '2026-09-13',
          startMinutes: 17 * 60,
          durationMinutes: 6 * 60 + 15,
          flight: {
            airline: 'Icelandair',
            flightNumber: 'FI 623',
            confirmationCode: 'AB2ZQV',
            departureAirport: 'EWR',
            arrivalAirport: 'KEF',
          },
        },
      ],
    });

    expect(normalized).toMatchObject({
      endDate: '2026-09-14',
      itinerary: [
        {
          id: 'outbound',
          title: 'Flight EWR → KEF',
          date: '2026-09-08',
        },
        {
          id: 'return',
          title: 'Flight KEF → EWR',
          date: '2026-09-14',
          flight: {
            flightNumber: 'FI 623',
            departureAirport: 'KEF',
            arrivalAirport: 'EWR',
          },
        },
      ],
    });
  });

  it('keeps valid trip participants and drops malformed invite records', () => {
    expect(
      normalizeTravelPlan({
        ...legacyPlan,
        participants: [
          { id: 'broken', name: '' },
          {
            id: 'person-1',
            name: '  Sam Rivera  ',
            email: 'sam@example.com',
            inviteCode: '0123456789abcdefabcd',
            invitedAt: '2026-07-27T12:00:00.000Z',
            acceptedAt: '2026-07-27T13:00:00.000Z',
          },
        ],
      })?.participants,
    ).toEqual([
      {
        id: 'person-1',
        name: 'Sam Rivera',
        email: 'sam@example.com',
        inviteCode: '0123456789abcdefabcd',
        invitedAt: '2026-07-27T12:00:00.000Z',
        acceptedAt: '2026-07-27T13:00:00.000Z',
      },
    ]);
  });

  it('ignores invalid cloud records', () => {
    expect(normalizeTravelPlans([legacyPlan, null, { title: 'Missing ID' }])).toHaveLength(1);
  });
});
