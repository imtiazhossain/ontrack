import { mergeFlightConfirmationDraftDetails } from '../flight-confirmation-draft';
import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { emptyFlightDetailsDraft } from '../flight-details';

const CHASE_CONNECTING = `
  Flight details
  Guatemala City (GUA) → New York (LGA)
  Sun, Sep 27, 2026
  1:30 am
  Guatemala City, GT (GUA)
  United Airlines
  UA 1907
  2h 51m
  5:21 am
  Houston, US (IAH)
  1h 39m layover in Houston
  7:00 am
  Houston, US (IAH)
  United Airlines
  UA 1697
  3h 29m
  11:29 am
  New York, US (LGA)
`;

describe('flight confirmation review draft', () => {
  it('fills the recognized connection and final destination', () => {
    const imported = parseFlightConfirmation(CHASE_CONNECTING);

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
    const imported = parseFlightConfirmation(CHASE_CONNECTING);
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
