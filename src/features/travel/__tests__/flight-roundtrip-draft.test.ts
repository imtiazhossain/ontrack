import {
  emptyFlightDetailsDraft,
  type FlightDetailsDraft,
} from '../flight-details';
import {
  emptyFlightLegScheduleDraft,
  flightDetailsFromSegment,
  segmentsFromRoundTripForm,
  suggestReturnDraftFromOutbound,
} from '../flight-roundtrip-draft';
import type { ParsedFlightSegment } from '../flight-confirmation-parser';

const outboundDetails = (): FlightDetailsDraft => ({
  ...emptyFlightDetailsDraft(),
  airline: 'Icelandair',
  flightNumber: 'FI 622',
  confirmationCode: 'AB2ZQV',
  departureAirport: 'EWR',
  arrivalAirport: 'KEF',
});

describe('flight round-trip draft helpers', () => {
  it('suggests a return by swapping outbound airports', () => {
    const suggested = suggestReturnDraftFromOutbound(outboundDetails(), {
      date: '2026-09-08',
      startMinutes: 20 * 60 + 25,
      endDate: '2026-09-09',
      endMinutes: 6 * 60 + 15,
    });

    expect(suggested.details).toMatchObject({
      airline: 'Icelandair',
      confirmationCode: 'AB2ZQV',
      departureAirport: 'KEF',
      arrivalAirport: 'EWR',
      flightNumber: '',
    });
    expect(suggested.schedule.date).toBe('2026-09-09');
  });

  it('builds outbound and return segments from the form', () => {
    const returnDetails: FlightDetailsDraft = {
      ...emptyFlightDetailsDraft(),
      airline: 'Icelandair',
      flightNumber: 'FI 623',
      departureAirport: 'KEF',
      arrivalAirport: 'EWR',
    };
    const segments = segmentsFromRoundTripForm({
      outboundDetails: outboundDetails(),
      outboundSchedule: {
        date: '2026-09-08',
        startMinutes: 20 * 60 + 25,
        endDate: '2026-09-09',
        endMinutes: 6 * 60 + 15,
      },
      outboundTitle: 'Flight EWR → KEF',
      returnDetails,
      returnSchedule: {
        date: '2026-09-14',
        startMinutes: 17 * 60,
        endDate: '2026-09-14',
        endMinutes: 19 * 60 + 15,
      },
    });

    expect(segments).toHaveLength(2);
    expect(segments?.[0]).toMatchObject({
      title: 'Flight EWR → KEF',
      date: '2026-09-08',
      startMinutes: 20 * 60 + 25,
      flight: { flightNumber: 'FI 622', departureAirport: 'EWR' },
    });
    expect(segments?.[1]).toMatchObject({
      title: 'Flight KEF → EWR',
      date: '2026-09-14',
      startMinutes: 17 * 60,
      flight: { flightNumber: 'FI 623', departureAirport: 'KEF' },
    });
  });

  it('keeps layover fields on each round-trip direction', () => {
    const segments = segmentsFromRoundTripForm({
      outboundDetails: {
        ...outboundDetails(),
        layoverMinutesAfter: '1h 39m',
        connectionAirport: 'IAH',
      },
      outboundSchedule: {
        date: '2026-09-08',
        startMinutes: 20 * 60 + 25,
        endDate: '2026-09-09',
        endMinutes: 6 * 60 + 15,
      },
      returnDetails: {
        ...emptyFlightDetailsDraft(),
        airline: 'Icelandair',
        flightNumber: 'FI 623',
        departureAirport: 'KEF',
        arrivalAirport: 'EWR',
        layoverMinutesAfter: '45m',
        connectionAirport: 'BOS',
      },
      returnSchedule: {
        date: '2026-09-14',
        startMinutes: 17 * 60,
        endDate: '2026-09-14',
        endMinutes: 19 * 60 + 15,
      },
    });

    expect(segments?.[0]).toMatchObject({
      layoverMinutesAfter: 99,
      flight: { connectionAirport: 'IAH' },
    });
    expect(segments?.[1]).toMatchObject({
      layoverMinutesAfter: 45,
      flight: { connectionAirport: 'BOS' },
    });
  });

  it('uses an explicit returning name when provided', () => {
    const returnDetails: FlightDetailsDraft = {
      ...emptyFlightDetailsDraft(),
      airline: 'Icelandair',
      flightNumber: 'FI 623',
      departureAirport: 'KEF',
      arrivalAirport: 'EWR',
    };
    const segments = segmentsFromRoundTripForm({
      outboundDetails: outboundDetails(),
      outboundSchedule: {
        date: '2026-09-08',
        startMinutes: 20 * 60 + 25,
        endDate: '2026-09-09',
        endMinutes: 6 * 60 + 15,
      },
      outboundTitle: 'Flight EWR → KEF',
      returnDetails,
      returnSchedule: {
        date: '2026-09-14',
        startMinutes: 17 * 60,
        endDate: '2026-09-14',
        endMinutes: 19 * 60 + 15,
      },
      returnTitle: 'Flight home',
    });

    expect(segments?.[1]?.title).toBe('Flight home');
  });

  it('rejects an incomplete return schedule', () => {
    expect(
      segmentsFromRoundTripForm({
        outboundDetails: outboundDetails(),
        outboundSchedule: {
          date: '2026-09-08',
          startMinutes: 20 * 60 + 25,
          endDate: '2026-09-09',
          endMinutes: 6 * 60 + 15,
        },
        returnDetails: emptyFlightDetailsDraft(),
        returnSchedule: emptyFlightLegScheduleDraft(),
      }),
    ).toBeUndefined();
  });

  it('copies a parsed return segment into a draft', () => {
    const segment: ParsedFlightSegment = {
      flight: {
        ...emptyFlightDetailsDraft(),
        airline: 'Icelandair',
        flightNumber: 'FI 623',
        departureAirport: 'KEF',
        arrivalAirport: 'EWR',
      },
      date: '2026-09-14',
      startMinutes: 17 * 60,
      durationMinutes: 375,
      layoverMinutesAfter: 99,
      detectedFieldCount: 4,
    };
    expect(flightDetailsFromSegment(segment)).toMatchObject({
      airline: 'Icelandair',
      flightNumber: 'FI 623',
      departureAirport: 'KEF',
      arrivalAirport: 'EWR',
      layoverMinutesAfter: '1h 39m',
      connectionAirport: 'EWR',
    });
  });
});
