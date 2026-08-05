import {
  flightItemDisplayTitle,
  formatFlightRouteLabel,
} from '../flight-route-label';
import type { TravelItineraryItem } from '../types';

describe('flight route label', () => {
  it('inserts the connection airport between departure and arrival', () => {
    expect(
      formatFlightRouteLabel({
        departureAirport: 'GUA',
        arrivalAirport: 'LGA',
        connectionAirport: 'IAH',
      }),
    ).toBe('GUA → IAH → LGA');
  });

  it('omits a connection that matches an endpoint', () => {
    expect(
      formatFlightRouteLabel({
        departureAirport: 'GUA',
        arrivalAirport: 'IAH',
        connectionAirport: 'IAH',
      }),
    ).toBe('GUA → IAH');
  });

  it('lists every stop from stored legs', () => {
    expect(
      formatFlightRouteLabel({
        departureAirport: 'GUA',
        arrivalAirport: 'LGA',
        legs: [
          { departureAirport: 'GUA', arrivalAirport: 'IAH' },
          { departureAirport: 'IAH', arrivalAirport: 'ORD' },
          { departureAirport: 'ORD', arrivalAirport: 'LGA' },
        ],
      }),
    ).toBe('GUA → IAH → ORD → LGA');
  });

  it('titles a connecting timeline flight with the route only', () => {
    const item = {
      id: 'f1',
      kind: 'flight',
      title: 'Flight GUA → LGA',
      date: '2026-09-27',
      startMinutes: 90,
      durationMinutes: 599,
      flight: {
        departureAirport: 'GUA',
        arrivalAirport: 'LGA',
        connectionAirport: 'IAH',
      },
    } as TravelItineraryItem;
    expect(flightItemDisplayTitle(item)).toBe('GUA → IAH → LGA');
  });
});
