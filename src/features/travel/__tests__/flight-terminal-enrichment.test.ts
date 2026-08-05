import { applyFlightTerminalPatches } from '../flight-terminal-enrichment';
import type { TravelPlan } from '../types';

const plan: TravelPlan = {
  id: 'trip-1',
  title: 'Trip',
  destination: 'New York',
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
        departureAirport: 'GUA',
        arrivalAirport: 'LGA',
        legs: [
          {
            flightNumber: 'UA 1907',
            date: '2026-09-27',
            departureAirport: 'GUA',
            arrivalAirport: 'IAH',
          },
          {
            flightNumber: 'UA 1697',
            date: '2026-09-27',
            departureAirport: 'IAH',
            arrivalAirport: 'LGA',
          },
        ],
      },
    },
  ],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-08-04T00:00:00.000Z',
  updatedAt: '2026-08-04T00:00:00.000Z',
};

describe('flight terminal enrichment', () => {
  it('persists terminal results on the journey and each connecting leg', () => {
    const result = applyFlightTerminalPatches(plan, {
      'flight-1': {
        departureTerminal: '2',
        arrivalTerminal: 'B',
        legs: [
          { departureTerminal: '2', arrivalTerminal: 'C' },
          { departureTerminal: 'C', arrivalTerminal: 'B' },
        ],
      },
    });

    expect(result?.itinerary[0].flight).toMatchObject({
      departureTerminal: '2',
      arrivalTerminal: 'B',
      legs: [
        { departureTerminal: '2', arrivalTerminal: 'C' },
        { departureTerminal: 'C', arrivalTerminal: 'B' },
      ],
    });
  });

  it('does not overwrite a terminal the user already saved', () => {
    const withManual = {
      ...plan,
      itinerary: plan.itinerary.map((item) => ({
        ...item,
        flight: item.flight
          ? { ...item.flight, departureTerminal: 'MANUAL' }
          : undefined,
      })),
    };
    const result = applyFlightTerminalPatches(withManual, {
      'flight-1': { departureTerminal: '2', arrivalTerminal: 'B' },
    });

    expect(result?.itinerary[0].flight?.departureTerminal).toBe('MANUAL');
    expect(result?.itinerary[0].flight?.arrivalTerminal).toBe('B');
  });
});
