import {
  attachOrphanedFlightConfirmationUris,
  mergeDuplicateItemConfirmationUris,
} from '../confirmation-uri-attach';
import type { TravelPlan } from '../types';

jest.mock('../confirmation-attachments', () => ({
  newestStoredConfirmationUris: jest.fn(() => [
    'file:///Documents/travel-confirmations/flight/latest.jpg',
  ]),
}));

const basePlan = (): TravelPlan => ({
  id: 'trip-1',
  title: 'Test',
  destination: 'LGA',
  startDate: '2026-09-27',
  endDate: '2026-09-30',
  itinerary: [
    {
      id: 'flight-1',
      kind: 'flight',
      title: 'Flight GUA → LGA',
      date: '2026-09-27',
      startMinutes: 90,
      durationMinutes: 599,
      flight: {
        airline: 'United Airlines',
        flightNumber: 'UA 1907',
        departureAirport: 'GUA',
        arrivalAirport: 'LGA',
      },
    },
  ],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-08-04T22:00:39.674Z',
  updatedAt: '2026-08-04T22:00:39.674Z',
});

describe('confirmation URI attach', () => {
  it('merges imported confirmation URIs onto a duplicate flight', () => {
    const plan = basePlan();
    const incoming = {
      ...plan.itinerary[0]!,
      id: 'flight-new',
      flight: {
        ...plan.itinerary[0]!.flight!,
        confirmationUris: [
          'file:///Documents/travel-confirmations/flight/import.jpg',
        ],
      },
    };
    const next = mergeDuplicateItemConfirmationUris(plan, incoming);
    expect(next?.itinerary[0]?.flight?.confirmationUris).toEqual([
      'file:///Documents/travel-confirmations/flight/import.jpg',
    ]);
  });

  it('attaches the newest on-disk confirmation when a lone flight has none', () => {
    const next = attachOrphanedFlightConfirmationUris(basePlan());
    expect(next?.itinerary[0]?.flight?.confirmationUris).toEqual([
      'file:///Documents/travel-confirmations/flight/latest.jpg',
    ]);
  });

  it('does not attach when the flight already has confirmation URIs', () => {
    const plan = basePlan();
    plan.itinerary[0] = {
      ...plan.itinerary[0]!,
      flight: {
        ...plan.itinerary[0]!.flight!,
        confirmationUris: [
          'file:///Documents/travel-confirmations/flight/kept.jpg',
        ],
      },
    };
    expect(attachOrphanedFlightConfirmationUris(plan)).toBeNull();
  });
});
