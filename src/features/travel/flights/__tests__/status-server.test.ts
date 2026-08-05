import { guardedFetch } from '@/services/http/dependency-guard';

import {
  lookupFlightStatus,
  validateFlightStatusInput,
} from '../status-server';

jest.mock('@/services/http/dependency-guard', () => ({
  guardedFetch: jest.fn(),
}));

const mockedFetch = guardedFetch as jest.MockedFunction<typeof guardedFetch>;

describe('AeroDataBox flight status adapter', () => {
  beforeEach(() => {
    process.env.AERODATABOX_API_KEY = 'test-key';
    mockedFetch.mockReset();
  });

  afterAll(() => {
    delete process.env.AERODATABOX_API_KEY;
  });

  it('validates a flight-number and local-date lookup', () => {
    expect(
      validateFlightStatusInput({
        flightNumber: ' ua 1907 ',
        date: '2026-09-27',
        departureAirport: 'gua',
        arrivalAirport: 'iah',
        mode: 'terminals',
      }),
    ).toEqual({
      flightNumber: 'UA 1907',
      date: '2026-09-27',
      departureAirport: 'GUA',
      arrivalAirport: 'IAH',
      mode: 'terminals',
    });
  });

  it('returns terminals without exposing status during automatic enrichment', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            status: 'Expected',
            departure: {
              airport: { iata: 'GUA' },
              terminal: '2',
            },
            arrival: {
              airport: { iata: 'IAH' },
              terminal: 'C',
            },
          },
        ]),
        { status: 200 },
      ),
    );

    const result = await lookupFlightStatus({
      flightNumber: 'UA 1907',
      date: '2026-09-27',
      departureAirport: 'GUA',
      arrivalAirport: 'IAH',
      mode: 'terminals',
    });
    expect(result).toMatchObject({
      departureTerminal: '2',
      arrivalTerminal: 'C',
    });
    expect(result).not.toHaveProperty('status');
  });

  it('returns normalized status only for an explicit status lookup', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'Delayed',
          departure: { airport: { iata: 'GUA' }, terminal: '2' },
          arrival: { airport: { iata: 'IAH' }, terminal: 'C' },
        }),
        { status: 200 },
      ),
    );

    await expect(
      lookupFlightStatus({
        flightNumber: 'UA 1907',
        date: '2026-09-27',
        departureAirport: 'GUA',
        arrivalAirport: 'IAH',
        mode: 'status',
      }),
    ).resolves.toMatchObject({
      status: 'delayed',
      statusLabel: 'Delayed',
    });
  });
});
