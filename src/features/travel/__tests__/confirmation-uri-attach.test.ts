import {
    attachOrphanedFlightConfirmationUris,
    mergeDuplicateItemConfirmationUris,
} from '../confirmation-uri-attach';
import type { TravelPlan } from '../types';

const mockNewestStoredConfirmationUris = jest.fn(() => [
  'file:///Documents/travel-confirmations/flight/latest.jpg',
]);

jest.mock('../confirmation-attachments', () => ({
  newestStoredConfirmationUris: (...args: unknown[]) =>
    mockNewestStoredConfirmationUris(...args),
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
  beforeEach(() => {
    mockNewestStoredConfirmationUris.mockReset();
    mockNewestStoredConfirmationUris.mockReturnValue([
      'file:///Documents/travel-confirmations/flight/latest.jpg',
    ]);
  });

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

  it('links a code-named orphan onto round-trip flights sharing one PNR', () => {
    mockNewestStoredConfirmationUris.mockReturnValue([
      'file:///Documents/travel-confirmations/flight/other.jpg',
      'file:///Documents/travel-confirmations/flight/AB2ZQV-iceland.pdf',
    ]);
    const plan = basePlan();
    plan.itinerary = [
      {
        id: 'out',
        kind: 'flight',
        title: 'Flight EWR → KEF',
        date: '2026-09-08',
        startMinutes: 1020,
        durationMinutes: 350,
        flight: {
          confirmationCode: 'AB2ZQV',
          departureAirport: 'EWR',
          arrivalAirport: 'KEF',
        },
      },
      {
        id: 'ret',
        kind: 'flight',
        title: 'Flight KEF → EWR',
        date: '2026-09-14',
        startMinutes: 1020,
        durationMinutes: 375,
        flight: {
          confirmationCode: 'AB2ZQV',
          departureAirport: 'KEF',
          arrivalAirport: 'EWR',
        },
      },
    ];
    const next = attachOrphanedFlightConfirmationUris(plan);
    expect(next?.itinerary[0]?.flight?.confirmationUris).toEqual([
      'file:///Documents/travel-confirmations/flight/AB2ZQV-iceland.pdf',
    ]);
    expect(next?.itinerary[1]?.flight?.confirmationUris).toEqual([
      'file:///Documents/travel-confirmations/flight/AB2ZQV-iceland.pdf',
    ]);
  });

  it('does not guess an unlabelled orphan for multi-flight trips', () => {
    mockNewestStoredConfirmationUris.mockReturnValue([
      'file:///Documents/travel-confirmations/flight/unlabelled.jpg',
    ]);
    const plan = basePlan();
    plan.itinerary = [
      {
        id: 'out',
        kind: 'flight',
        title: 'Outbound',
        date: '2026-09-08',
        startMinutes: 100,
        durationMinutes: 120,
        flight: { confirmationCode: 'AB2ZQV', departureAirport: 'EWR' },
      },
      {
        id: 'ret',
        kind: 'flight',
        title: 'Return',
        date: '2026-09-14',
        startMinutes: 100,
        durationMinutes: 120,
        flight: { confirmationCode: 'AB2ZQV', departureAirport: 'KEF' },
      },
    ];
    expect(attachOrphanedFlightConfirmationUris(plan)).toBeNull();
  });

  it('skips orphans already linked on another plan', () => {
    mockNewestStoredConfirmationUris.mockReturnValue([
      'file:///Documents/travel-confirmations/flight/shared.jpg',
    ]);
    const other: TravelPlan = {
      ...basePlan(),
      id: 'trip-other',
      itinerary: [
        {
          id: 'other-flight',
          kind: 'flight',
          title: 'Other',
          date: '2026-09-01',
          startMinutes: 60,
          durationMinutes: 60,
          flight: {
            confirmationUris: [
              'file:///Documents/travel-confirmations/flight/shared.jpg',
            ],
          },
        },
      ],
    };
    expect(
      attachOrphanedFlightConfirmationUris(basePlan(), {
        allPlans: [basePlan(), other],
      }),
    ).toBeNull();
  });
});
