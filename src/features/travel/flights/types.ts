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
