import { CHASE_CONNECTING_CONFIRMATION } from '../fixtures/chase-connecting-confirmation';
import { CHASE_ROUNDTRIP_CONFIRMATION } from '../fixtures/chase-roundtrip-confirmation';
import { mergeFlightConfirmationDraftDetails } from '../flight-confirmation-draft';
import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { emptyFlightDetailsDraft } from '../flight-details';

describe('flight confirmation review draft', () => {
  it('fills outbound-only fields for a round-trip confirmation', () => {
    const imported = parseFlightConfirmation(CHASE_ROUNDTRIP_CONFIRMATION, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });

    expect(imported.segments).toHaveLength(2);
    expect(
      mergeFlightConfirmationDraftDetails(
        {
          ...emptyFlightDetailsDraft(),
          connectionAirport: 'IAH',
          layoverMinutesAfter: '1h 39m',
        },
        imported,
      ),
    ).toMatchObject({
      airline: 'Icelandair',
      flightNumber: 'FI 622',
      departureAirport: 'EWR',
      arrivalAirport: 'KEF',
      connectionAirport: '',
      layoverMinutesAfter: '',
    });
    expect(
      mergeFlightConfirmationDraftDetails(emptyFlightDetailsDraft(), imported)
        .legs,
    ).toBeUndefined();
  });

  it('fills the recognized connection and final destination', () => {
    const imported = parseFlightConfirmation(CHASE_CONNECTING_CONFIRMATION);

    expect(
      mergeFlightConfirmationDraftDetails(emptyFlightDetailsDraft(), imported),
    ).toMatchObject({
      airline: 'United Airlines',
      flightNumber: 'UA 1907',
      departureAirport: 'GUA',
      arrivalAirport: 'LGA',
      connectionAirport: 'IAH',
      layoverMinutesAfter: '1h 39m',
      connectionArrivalMinutes: 5 * 60 + 21,
      connectionDepartureMinutes: 7 * 60,
    });
    expect(
      mergeFlightConfirmationDraftDetails(emptyFlightDetailsDraft(), imported)
        .legs,
    ).toHaveLength(2);
  });

  it('keeps confirmation screenshot URIs on the review draft', () => {
    const imported = parseFlightConfirmation(CHASE_CONNECTING_CONFIRMATION);
    const withUris = {
      ...imported,
      confirmationUris: [
        'file:///Documents/travel-confirmations/flight/chase.png',
      ],
    };

    expect(
      mergeFlightConfirmationDraftDetails(emptyFlightDetailsDraft(), withUris)
        .confirmationUris,
    ).toEqual([
      'file:///Documents/travel-confirmations/flight/chase.png',
    ]);
  });
});
