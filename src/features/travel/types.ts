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

export type TravelExpenseCategory =
  | 'flight'
  | 'stay'
  | 'food'
  | 'transport'
  | 'activity'
  | 'shopping'
  | 'other';

/** Local trip owner in expense paid-by / split lists (not a TravelParticipant id). */
export const TRAVEL_EXPENSE_SELF_ID = 'self';

export interface TravelExpense {
  id: string;
  title: string;
  /** Original amount in `currency` (> 0). */
  amount: number;
  /** ISO 4217 uppercase. */
  currency: string;
  /** Local calendar day YYYY-MM-DD. */
  date: string;
  category: TravelExpenseCategory;
  notes?: string;
  /** `TRAVEL_EXPENSE_SELF_ID` or a participant id. */
  paidById: string;
  /** Equal shares among these people (≥ 1). */
  splitWithIds: string[];
  createdAt: string;
  updatedAt: string;
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
  /** ISO 4217 for trip totals / settle-up. */
  baseCurrency: string;
  expenses: TravelExpense[];
  createdAt: string;
  updatedAt: string;
}
