import * as WebBrowser from 'expo-web-browser';
import type { SymbolViewProps } from 'expo-symbols';

import type { TravelPlan } from '@/features/travel/types';

export type StayProviderId = 'booking' | 'airbnb' | 'hostelworld';

export interface StaySearchInput {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface StayProvider {
  id: StayProviderId;
  name: string;
  description: string;
  icon: SymbolViewProps['name'];
  searchUrl: (input: StaySearchInput) => string;
}

function addSearchParams(
  baseUrl: string,
  params: Record<string, string | number>,
): string {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function bookingSearchUrl(input: StaySearchInput): string {
  return addSearchParams('https://www.booking.com/searchresults.html', {
    ss: input.destination,
    checkin: input.checkIn,
    checkout: input.checkOut,
    group_adults: input.guests,
    no_rooms: 1,
  });
}

export function airbnbSearchUrl(input: StaySearchInput): string {
  const destinationPath = encodeURIComponent(
    input.destination
      .split(',')
      .map((part) => part.trim().replace(/\s+/g, '-'))
      .filter(Boolean)
      .join('--'),
  );
  return addSearchParams(`https://www.airbnb.com/s/${destinationPath}/homes`, {
    checkin: input.checkIn,
    checkout: input.checkOut,
    adults: input.guests,
  });
}

export function hostelworldSearchUrl(input: StaySearchInput): string {
  return addSearchParams('https://www.hostelworld.com/hostels/', {
    q: input.destination,
    from: input.checkIn,
    to: input.checkOut,
    guests: input.guests,
  });
}

export const stayProviders: StayProvider[] = [
  {
    id: 'booking',
    name: 'Booking.com',
    description: 'Hotels, apartments, and resorts',
    icon: 'building.2.fill',
    searchUrl: bookingSearchUrl,
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    description: 'Homes, rooms, and unique stays',
    icon: 'house.fill',
    searchUrl: airbnbSearchUrl,
  },
  {
    id: 'hostelworld',
    name: 'Hostelworld',
    description: 'Hostels and social stays',
    icon: 'bed.double.fill',
    searchUrl: hostelworldSearchUrl,
  },
];

export function staySearchInput(plan: TravelPlan): StaySearchInput {
  return {
    destination: plan.destination,
    checkIn: plan.startDate,
    checkOut: plan.endDate,
    guests: Math.max(1, plan.participants.length + 1),
  };
}

export async function searchStays(
  provider: StayProvider,
  plan: TravelPlan,
): Promise<void> {
  await WebBrowser.openBrowserAsync(provider.searchUrl(staySearchInput(plan)));
}
