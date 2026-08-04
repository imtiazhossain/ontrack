import {
  emptyTransportDetailsDraft,
  normalizeTransportDetails,
  transportDirectionsUrl,
  validateTransportDetails,
} from '../transport-details';

describe('travel transport details', () => {
  it.each([
    'driving', 'train', 'bus', 'subway', 'tram', 'ferry',
    'rideshare', 'taxi', 'shuttle', 'other',
  ] as const)('normalizes the %s mode', (mode) => {
    expect(normalizeTransportDetails({
      mode,
      origin: 'New York',
      destination: 'Washington',
      arrivalDate: '2026-09-12',
      arrivalMinutes: 13 * 60,
    })).toMatchObject({ mode, origin: 'New York', destination: 'Washington' });
  });

  it('rejects arrival before departure and out-of-order timed stops', () => {
    const base = emptyTransportDetailsDraft({
      origin: 'New York',
      destination: 'Washington',
      arrivalDate: '2026-09-12',
      arrivalMinutes: 8 * 60,
    });
    expect(validateTransportDetails({
      draft: base,
      departureDate: '2026-09-12',
      departureMinutes: 9 * 60,
      planStartDate: '2026-09-12',
      planEndDate: '2026-09-14',
    })).toEqual(expect.objectContaining({ ok: false }));

    const withStops = {
      ...base,
      arrivalMinutes: 15 * 60,
      stops: [
        { id: 'a', name: 'First', address: '', arrivalDate: '2026-09-12', arrivalMinutes: 12 * 60, notes: '' },
        { id: 'b', name: 'Second', address: '', arrivalDate: '2026-09-12', arrivalMinutes: 11 * 60, notes: '' },
      ],
    };
    expect(validateTransportDetails({
      draft: withStops,
      departureDate: '2026-09-12',
      departureMinutes: 9 * 60,
      planStartDate: '2026-09-12',
      planEndDate: '2026-09-14',
    })).toEqual(expect.objectContaining({ ok: false }));
  });

  it('builds a driving directions URL with ordered waypoints', () => {
    const url = transportDirectionsUrl({
      mode: 'driving',
      origin: 'New York, NY',
      destination: 'Washington, DC',
      stops: [
        { id: 'one', name: 'Philadelphia', address: '30th Street Station, Philadelphia' },
        { id: 'two', name: 'Baltimore' },
      ],
    });
    expect(url).toContain('origin=New+York%2C+NY');
    expect(url).toContain('destination=Washington%2C+DC');
    expect(url).toContain('waypoints=30th+Street+Station%2C+Philadelphia%7CBaltimore');
  });
});
