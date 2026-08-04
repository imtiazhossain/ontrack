import { mergeFlightConfirmationDraftDetails } from '../flight-confirmation-draft';
import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { emptyFlightDetailsDraft } from '../flight-details';

describe('flight confirmation review draft', () => {
  it('fills the recognized connection and final destination', () => {
    const imported = parseFlightConfirmation(`
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
    `);

    expect(
      mergeFlightConfirmationDraftDetails(emptyFlightDetailsDraft(), imported),
    ).toMatchObject({
      airline: 'United Airlines',
      flightNumber: 'UA 1907',
      departureAirport: 'GUA',
      arrivalAirport: 'LGA',
      layoverMinutesAfter: '1h 39m',
    });
  });
});
