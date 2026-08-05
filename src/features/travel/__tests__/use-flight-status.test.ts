import {
    __resetFlightStatusSyncCooldownsForTests,
    __setFlightStatusSyncAtForTests,
    FLIGHT_STATUS_SYNC_COOLDOWN_MS,
    flightStatusSyncCooldownMinutesRemaining,
    flightStatusSyncCooldownRemainingMs,
    flightStatusSyncRequestKey,
    type FlightStatusRequest,
} from '../use-flight-status';

function request(
  flightNumber: string,
  date: string,
  departureAirport?: string,
  arrivalAirport?: string,
): FlightStatusRequest {
  return {
    input: {
      flightNumber,
      date,
      departureAirport,
      arrivalAirport,
      mode: 'status',
    },
  };
}

describe('flight status sync cooldown', () => {
  beforeEach(() => {
    __resetFlightStatusSyncCooldownsForTests();
  });

  it('builds a stable key from flight number, date, and airports', () => {
    expect(
      flightStatusSyncRequestKey([
        request('UA 1907', '2026-09-30', 'GUA', 'IAH'),
        request('ua1697', '2026-09-30', 'IAH', 'LGA'),
      ]),
    ).toBe('UA1907|2026-09-30|GUA|IAH;UA1697|2026-09-30|IAH|LGA');
  });

  it('reports no cooldown until a sync is recorded', () => {
    const key = flightStatusSyncRequestKey([
      request('UA70', '2026-09-27', 'EWR', 'LIS'),
    ]);
    expect(flightStatusSyncCooldownRemainingMs(key)).toBe(0);
    expect(flightStatusSyncCooldownMinutesRemaining(0)).toBe(0);
  });

  it('blocks re-sync for 10 minutes after a check', () => {
    const key = flightStatusSyncRequestKey([
      request('UA70', '2026-09-27', 'EWR', 'LIS'),
    ]);
    const now = 1_700_000_000_000;
    __setFlightStatusSyncAtForTests(key, now);

    expect(
      flightStatusSyncCooldownRemainingMs(key, now + 30_000),
    ).toBe(FLIGHT_STATUS_SYNC_COOLDOWN_MS - 30_000);
    expect(
      flightStatusSyncCooldownMinutesRemaining(
        FLIGHT_STATUS_SYNC_COOLDOWN_MS - 30_000,
      ),
    ).toBe(10);
    expect(flightStatusSyncCooldownMinutesRemaining(60_000)).toBe(1);
    expect(flightStatusSyncCooldownMinutesRemaining(1)).toBe(1);
    expect(
      flightStatusSyncCooldownRemainingMs(
        key,
        now + FLIGHT_STATUS_SYNC_COOLDOWN_MS,
      ),
    ).toBe(0);
  });
});
