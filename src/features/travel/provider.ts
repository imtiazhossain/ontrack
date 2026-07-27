import * as WebBrowser from 'expo-web-browser';

import type { TravelPlan } from './types';

export interface GoogleFlightComparison {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
}

export function googleFlightsSearchUrl(input: GoogleFlightComparison): string {
  const query = [
    `Flights from ${input.origin.trim()} to ${input.destination.trim()}`,
    `departing ${input.departureDate}`,
    `returning ${input.returnDate}`,
    `for ${input.adults} ${input.adults === 1 ? 'adult' : 'adults'}`,
  ].join(' ');
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export async function compareOnGoogleFlights(input: GoogleFlightComparison): Promise<void> {
  await WebBrowser.openBrowserAsync(googleFlightsSearchUrl(input));
}

export interface TravelSearchProvider {
  searchStays: (plan: TravelPlan) => Promise<void>;
}

/**
 * Zero-API-cost provider used by the beta. It opens a normal web checkout, so
 * the app never handles payment details and does not pay an aggregator fee.
 *
 * A future direct API provider only needs to implement this interface.
 */
export const webTravelSearchProvider: TravelSearchProvider = {
  searchStays: async (plan) => {
    const params = new URLSearchParams({
      ss: plan.destination,
      checkin: plan.startDate,
      checkout: plan.endDate,
    });
    await WebBrowser.openBrowserAsync(`https://www.booking.com/searchresults.html?${params.toString()}`);
  },
};
