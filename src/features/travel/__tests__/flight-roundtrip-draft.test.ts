import type { ParsedFlightSegment } from '../flight-confirmation-parser';
import {
    emptyFlightDetailsDraft,
    type FlightDetailsDraft,
} from '../flight-details';
import {
    emptyFlightLegScheduleDraft,
    flightDetailsFromSegment,
    segmentsFromDirectionForm,
    segmentsFromRoundTripForm,
    suggestReturnDraftFromOutbound,
} from '../flight-roundtrip-draft';

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
      durationMinutes: 5 * 60 + 50,
      flight: { flightNumber: 'FI 622', departureAirport: 'EWR' },
    });
    expect(segments?.[1]).toMatchObject({
      title: 'Flight KEF → EWR',
      date: '2026-09-14',
      startMinutes: 17 * 60,
      durationMinutes: 6 * 60 + 15,
      flight: { flightNumber: 'FI 623', departureAirport: 'KEF' },
    });
  });

  it('applies form edits when rebuilding imported connecting legs', () => {
    const segments = segmentsFromRoundTripForm({
      outboundDetails: {
        ...outboundDetails(),
        departureAirport: 'EWR',
        arrivalAirport: 'KEF',
        flightNumber: 'FI 999',
        layoverMinutesAfter: '2h',
        connectionAirport: 'BOS',
        legs: [
          {
            airline: 'Icelandair',
            flightNumber: 'FI 622',
            departureAirport: 'EWR',
            arrivalAirport: 'BOS',
            date: '2026-09-08',
            departureMinutes: 20 * 60 + 25,
            arrivalDate: '2026-09-08',
            arrivalMinutes: 22 * 60,
            durationMinutes: 95,
            layoverMinutesAfter: 99,
          },
          {
            airline: 'Icelandair',
            flightNumber: 'FI 700',
            departureAirport: 'BOS',
            arrivalAirport: 'KEF',
            date: '2026-09-08',
            departureMinutes: 23 * 60 + 40,
            arrivalDate: '2026-09-09',
            arrivalMinutes: 6 * 60 + 15,
            durationMinutes: 275,
          },
        ],
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
      },
      returnSchedule: {
        date: '2026-09-14',
        startMinutes: 17 * 60,
        endDate: '2026-09-14',
        endMinutes: 19 * 60 + 15,
      },
      returnTitle: 'Flight home',
    });

    expect(segments?.[0]).toMatchObject({
      layoverMinutesAfter: 120,
      flight: {
        flightNumber: 'FI 999',
        departureAirport: 'EWR',
        arrivalAirport: 'BOS',
        connectionAirport: 'BOS',
      },
    });
    expect(segments?.[1]).toMatchObject({
      flight: {
        departureAirport: 'BOS',
        arrivalAirport: 'KEF',
      },
    });
  });

  it('shifts connecting leg clocks when the direction departure moves', () => {
    const segments = segmentsFromDirectionForm(
      {
        ...outboundDetails(),
        departureAirport: 'EWR',
        arrivalAirport: 'KEF',
        layoverMinutesAfter: '1h 39m',
        connectionAirport: 'BOS',
        legs: [
          {
            airline: 'Icelandair',
            flightNumber: 'FI 622',
            departureAirport: 'EWR',
            arrivalAirport: 'BOS',
            date: '2026-09-08',
            departureMinutes: 20 * 60 + 25,
            arrivalDate: '2026-09-08',
            arrivalMinutes: 22 * 60,
            durationMinutes: 95,
            layoverMinutesAfter: 99,
          },
          {
            airline: 'Icelandair',
            flightNumber: 'FI 700',
            departureAirport: 'BOS',
            arrivalAirport: 'KEF',
            date: '2026-09-08',
            departureMinutes: 23 * 60 + 40,
            arrivalDate: '2026-09-09',
            arrivalMinutes: 6 * 60 + 15,
            durationMinutes: 275,
          },
        ],
      },
      {
        date: '2026-09-08',
        startMinutes: 21 * 60 + 25,
        endDate: '2026-09-09',
        endMinutes: 7 * 60 + 15,
      },
      { fallback: 'Departure flight' },
    );

    expect(segments?.[0]).toMatchObject({
      date: '2026-09-08',
      startMinutes: 21 * 60 + 25,
      arrivalMinutes: 23 * 60,
    });
    expect(segments?.[1]).toMatchObject({
      date: '2026-09-09',
      startMinutes: 40,
      arrivalDate: '2026-09-09',
      arrivalMinutes: 7 * 60 + 15,
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
