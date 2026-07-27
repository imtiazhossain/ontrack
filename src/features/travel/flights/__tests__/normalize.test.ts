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
        }),
      }),
    ]);
  });

  it('drops incomplete offers instead of crashing the results screen', () => {
    expect(normalizeFlightOffers([{ id: 'broken' }], {})).toEqual([]);
  });
});
