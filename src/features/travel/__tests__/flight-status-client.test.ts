import { agentUiDemoFlightStatusResponse } from '../flight-status-client';

describe('agentUiDemoFlightStatusResponse', () => {
  it('short-circuits demo status lookups without calling the provider', () => {
    expect(
      agentUiDemoFlightStatusResponse({
        flightNumber: 'UA 70',
        date: '2026-09-27',
        departureAirport: 'EWR',
        arrivalAirport: 'LIS',
        mode: 'status',
      }),
    ).toMatchObject({
      status: 'scheduled',
      statusLabel: 'On Time',
    });
  });

  it('short-circuits demo terminal lookups without calling the provider', () => {
    expect(
      agentUiDemoFlightStatusResponse({
        flightNumber: 'UA1907',
        date: '2026-09-30',
        departureAirport: 'GUA',
        arrivalAirport: 'IAH',
        mode: 'terminals',
      }),
    ).toMatchObject({
      departureTerminal: '1',
      arrivalTerminal: 'C',
    });
  });

  it('does not stub non-demo flights', () => {
    expect(
      agentUiDemoFlightStatusResponse({
        flightNumber: 'AA100',
        date: '2026-09-27',
        mode: 'status',
      }),
    ).toBeUndefined();
  });
});
