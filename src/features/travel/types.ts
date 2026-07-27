export type TravelItemKind = 'flight' | 'stay' | 'activity';

export interface TravelFlightDetails {
  airline?: string;
  flightNumber?: string;
  confirmationCode?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  seat?: string;
}

export interface TravelItineraryItem {
  id: string;
  kind: TravelItemKind;
  title: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  details?: string;
  bookingUrl?: string;
  flight?: TravelFlightDetails;
}

export interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
  itinerary: TravelItineraryItem[];
  createdAt: string;
  updatedAt: string;
}
