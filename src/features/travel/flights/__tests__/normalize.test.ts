import { normalizeFlightOffers } from '../normalize';

describe('flight offer normalization', () => {
  it('maps provider data into the app flight contract', () => {
    expect(normalizeFlightOffers([
      {
        id: 'offer-1',
        numberOfBookableSeats: 4,
        price: { total: '845.20', currency: 'USD' },
        itineraries: [
          {
            duration: 'PT6H30M',
            segments: [{
              departure: { iataCode: 'JFK', at: '2026-09-08T18:00:00' },
              arrival: { iataCode: 'KEF', at: '2026-09-09T06:30:00' },
              carrierCode: 'FI',
              number: '614',
            }],
          },
        ],
      },
    ], { FI: 'Icelandair' })).toEqual([
      expect.objectContaining({
        id: 'offer-1',
        totalPrice: '845.20',
        currency: 'USD',
        seatsAvailable: 4,
        outbound: expect.objectContaining({
          departureCode: 'JFK',
          arrivalCode: 'KEF',
          carrier: 'Icelandair',
          stops: 0,
          segments: [
            expect.objectContaining({
              departureCode: 'JFK',
              arrivalCode: 'KEF',
              flightNumber: 'FI614',
            }),
          ],
        }),
      }),
    ]);
  });

  it('preserves every segment of a multi-stop itinerary', () => {
    const [offer] = normalizeFlightOffers(
      [
        {
          id: 'offer-connecting',
          price: { total: '910.00', currency: 'USD' },
          itineraries: [
            {
              duration: 'PT11H15M',
              segments: [
                {
                  departure: { iataCode: 'JFK', at: '2026-09-08T18:00:00' },
                  arrival: { iataCode: 'CDG', at: '2026-09-09T07:20:00' },
                  carrierCode: 'AF',
                  number: '009',
                },
                {
                  departure: { iataCode: 'CDG', at: '2026-09-09T09:10:00' },
                  arrival: { iataCode: 'FCO', at: '2026-09-09T11:15:00' },
                  carrierCode: 'AZ',
                  number: '319',
                },
                {
                  departure: { iataCode: 'FCO', at: '2026-09-09T13:00:00' },
                  arrival: { iataCode: 'ATH', at: '2026-09-09T16:00:00' },
                  carrierCode: 'A3',
                  number: '651',
                },
              ],
            },
          ],
        },
      ],
      { AF: 'Air France', AZ: 'ITA Airways', A3: 'Aegean Airlines' },
    );

    expect(offer.outbound).toMatchObject({
      departureCode: 'JFK',
      arrivalCode: 'ATH',
      stops: 2,
      segments: [
        {
          departureCode: 'JFK',
          arrivalCode: 'CDG',
          carrier: 'Air France',
          flightNumber: 'AF009',
        },
        {
          departureCode: 'CDG',
          arrivalCode: 'FCO',
          carrier: 'ITA Airways',
          flightNumber: 'AZ319',
        },
        {
          departureCode: 'FCO',
          arrivalCode: 'ATH',
          carrier: 'Aegean Airlines',
          flightNumber: 'A3651',
        },
      ],
    });
  });

  it('drops incomplete offers instead of crashing the results screen', () => {
    expect(normalizeFlightOffers([{ id: 'broken' }], {})).toEqual([]);
  });
});
