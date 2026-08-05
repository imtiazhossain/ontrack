export type FlightConfirmationAISegment = {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  departureTerminal?: string;
  arrivalAirport?: string;
  arrivalTerminal?: string;
  departureDate?: string;
  departureMinutes?: number;
  arrivalDate?: string;
  arrivalMinutes?: number;
  durationMinutes?: number;
  layoverMinutesAfter?: number;
  confidence: number;
};

export type FlightConfirmationAIResult = {
  segments: FlightConfirmationAISegment[];
  itineraryDates: string[];
};

export type FlightConfirmationAIRequest = {
  /** OCR text with passenger and booking identifiers already replaced. */
  redactedText: string;
};
