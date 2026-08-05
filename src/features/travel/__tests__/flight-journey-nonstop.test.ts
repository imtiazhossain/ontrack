import {
  buildFlightJourneyViewModel,
  flightPassengerLabel,
  resolveFlightLegs,
} from '../flight-journey-model';
import {
  formatFlightGate,
  formatFlightTerminal,
  parseLabeledFlightGate,
} from '../flight-terminal';
import type { TravelFlightDetails } from '../types';

const nonStop: TravelFlightDetails = {
  airline: 'United Airlines',
  flightNumber: 'UA 1907',
  confirmationCode: 'HF7K2Q',
  departureAirport: 'gua',
  departureTerminal: '1',
  departureGate: '5',
  arrivalAirport: 'lga',
  arrivalTerminal: 'B',
  arrivalGate: '22',
};

const schedule = {
  details: nonStop,
  date: '2026-09-27',
  startMinutes: 90,
  durationMinutes: 239,
};

describe('non-stop flights share the journey card model', () => {
  it('synthesizes a single leg with a computed arrival', () => {
    const legs = resolveFlightLegs(schedule);
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({
      departureAirport: 'GUA',
      departureTerminal: '1',
      departureGate: '5',
      arrivalAirport: 'LGA',
      arrivalTerminal: 'B',
      arrivalGate: '22',
      departureMinutes: 90,
      durationMinutes: 239,
    });
    // GUA (UTC-6) → LGA (EDT) shifts the 5:29 block-time landing to 7:29 local.
    expect(legs[0]?.arrivalMinutes).toBe(7 * 60 + 29);
  });

  it('builds a zero-stop journey with no layover banner', () => {
    const journey = buildFlightJourneyViewModel(schedule);
    expect(journey.stopCount).toBe(0);
    expect(journey.routeAirports).toEqual(['GUA', 'LGA']);
    expect(journey.legs[0]?.layoverAfter).toBeUndefined();
    expect(journey.legs[0]?.departure.gate).toBe('5');
    expect(journey.legs[0]?.arrival.gate).toBe('22');
  });

  it('still reconstructs two legs for a legacy collapsed connection', () => {
    const journey = buildFlightJourneyViewModel({
      ...schedule,
      details: {
        ...nonStop,
        connectionAirport: 'IAH',
        connectionArrivalMinutes: 5 * 60 + 21,
        connectionDepartureMinutes: 7 * 60,
        layoverMinutesAfter: 99,
      },
      durationMinutes: 9 * 60 + 59,
    });
    expect(journey.legs).toHaveLength(2);
    expect(journey.stopCount).toBe(1);
  });
});

describe('connecting journeys inherit booking-level facilities', () => {
  const connecting = buildFlightJourneyViewModel({
    details: {
      ...nonStop,
      legs: [
        {
          departureAirport: 'GUA',
          arrivalAirport: 'IAH',
          departureMinutes: 90,
          arrivalMinutes: 321,
          durationMinutes: 171,
          layoverMinutesAfter: 99,
        },
        {
          departureAirport: 'IAH',
          arrivalAirport: 'LGA',
          departureMinutes: 420,
          arrivalMinutes: 689,
          durationMinutes: 209,
        },
      ],
    },
    date: '2026-09-27',
    startMinutes: 90,
    durationMinutes: 9 * 60 + 59,
  });

  it('shows the booking terminal/gate at the first departure and last arrival', () => {
    expect(connecting.legs[0]?.departure).toMatchObject({
      terminal: '1',
      gate: '5',
    });
    expect(connecting.legs[1]?.arrival).toMatchObject({
      terminal: 'B',
      gate: '22',
    });
  });

  it('leaves connection stops without borrowed terminal/gate', () => {
    expect(connecting.legs[0]?.arrival.terminal).toBeUndefined();
    expect(connecting.legs[1]?.departure.gate).toBeUndefined();
  });
});

describe('terminal and gate chrome', () => {
  it('labels bare terminal and gate values', () => {
    expect(formatFlightTerminal('1')).toBe('Terminal 1');
    expect(formatFlightTerminal('Terminal B')).toBe('Terminal B');
    expect(formatFlightGate('22')).toBe('Gate 22');
    expect(formatFlightGate('Gate C5')).toBe('Gate C5');
    expect(formatFlightGate('   ')).toBeUndefined();
  });

  it('reads a labeled gate and falls back to a lone boarding-pass gate', () => {
    expect(parseLabeledFlightGate('Arrival gate: 22', 'arrival')).toBe('22');
    expect(parseLabeledFlightGate('Boarding at Gate C5', 'departure')).toBe(
      'C5',
    );
    expect(parseLabeledFlightGate('Boarding at Gate C5', 'arrival')).toBe('');
  });
});

describe('passenger label', () => {
  it('prefers the named traveler and pluralizes counts', () => {
    expect(flightPassengerLabel({ passengerName: 'Ada Lovelace' })).toBe(
      'Ada Lovelace',
    );
    expect(flightPassengerLabel({})).toBe('1 Traveler');
    expect(flightPassengerLabel({ passengerCount: 3 })).toBe('3 Travelers');
  });
});
