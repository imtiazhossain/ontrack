export interface FlightSearchInput {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  currencyCode: string;
}

export interface FlightLeg {
  departureCode: string;
  departureAt: string;
  arrivalCode: string;
  arrivalAt: string;
  duration: string;
  stops: number;
  carrier: string;
  flightNumber: string;
  segments: FlightSegment[];
}

export interface FlightSegment {
  departureCode: string;
  departureAt: string;
  arrivalCode: string;
  arrivalAt: string;
  carrier: string;
  flightNumber: string;
}

export interface FlightOffer {
  id: string;
  totalPrice: string;
  currency: string;
  seatsAvailable?: number;
  outbound: FlightLeg;
  inbound?: FlightLeg;
}

export interface FlightSearchResponse {
  originCode: string;
  destinationCode: string;
  offers: FlightOffer[];
  searchedAt: string;
  dataMode: 'live' | 'test';
}

export interface FlightApiError {
  error?: string;
  code?: 'INVALID_SEARCH' | 'NOT_CONFIGURED' | 'NO_AIRPORT' | 'RATE_LIMITED' | 'PROVIDER_FAILURE';
}

export type FlightOperationalStatus =
  | 'scheduled'
  | 'check-in'
  | 'boarding'
  | 'gate-closed'
  | 'departed'
  | 'delayed'
  | 'approaching'
  | 'landed'
  | 'cancelled'
  | 'diverted'
  | 'unknown';

/** Title-case badge copy for a normalized operational status. */
export function flightOperationalStatusLabel(
  status?: FlightOperationalStatus,
): string | undefined {
  if (!status || status === 'unknown') return undefined;
  return {
    scheduled: 'On Time',
    'check-in': 'Check-In Open',
    boarding: 'Boarding',
    'gate-closed': 'Gate Closed',
    departed: 'Departed',
    delayed: 'Delayed',
    approaching: 'Approaching',
    landed: 'Landed',
    cancelled: 'Cancelled',
    diverted: 'Diverted',
  }[status];
}

export interface FlightStatusInput {
  flightNumber: string;
  date: string;
  departureAirport?: string;
  arrivalAirport?: string;
  mode: 'terminals' | 'status';
}

export interface FlightStatusResponse {
  departureTerminal?: string;
  departureGate?: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
  status?: FlightOperationalStatus;
  statusLabel?: string;
  checkedAt: string;
}
