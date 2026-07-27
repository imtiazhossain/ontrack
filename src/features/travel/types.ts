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

export interface TravelParticipant {
  id: string;
  name: string;
  email?: string;
  inviteCode: string;
  invitedAt: string;
  acceptedAt?: string;
}

export interface TravelPlan {
  id: string;
  /** Hosted invite capability used by an invited member to join this trip's chat. */
  chatAccessCode?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
  itinerary: TravelItineraryItem[];
  participants: TravelParticipant[];
  createdAt: string;
  updatedAt: string;
}
