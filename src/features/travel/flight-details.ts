import type { TravelFlightDetails } from './types';

export interface FlightDetailsDraft {
  airline: string;
  flightNumber: string;
  confirmationCode: string;
  departureAirport: string;
  arrivalAirport: string;
  seat: string;
}

export function emptyFlightDetailsDraft(): FlightDetailsDraft {
  return {
    airline: '',
    flightNumber: '',
    confirmationCode: '',
    departureAirport: '',
    arrivalAirport: '',
    seat: '',
  };
}

function optionalText(value: unknown, uppercase = false): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return uppercase ? trimmed.toUpperCase() : trimmed;
}

export function flightDetailsDraft(
  value?: TravelFlightDetails,
): FlightDetailsDraft {
  return {
    airline: value?.airline ?? '',
    flightNumber: value?.flightNumber ?? '',
    confirmationCode: value?.confirmationCode ?? '',
    departureAirport: value?.departureAirport ?? '',
    arrivalAirport: value?.arrivalAirport ?? '',
    seat: value?.seat ?? '',
  };
}

export function normalizeFlightDetails(value: unknown): TravelFlightDetails | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<Record<keyof TravelFlightDetails, unknown>>;
  const normalized: TravelFlightDetails = {
    airline: optionalText(input.airline),
    flightNumber: optionalText(input.flightNumber, true),
    confirmationCode: optionalText(input.confirmationCode, true),
    departureAirport: optionalText(input.departureAirport, true),
    arrivalAirport: optionalText(input.arrivalAirport, true),
    seat: optionalText(input.seat, true),
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

export function validateFlightDetails(
  draft: FlightDetailsDraft,
):
  | { ok: true; value: TravelFlightDetails | undefined }
  | { ok: false; error: string } {
  const value = normalizeFlightDetails(draft);
  if (
    value?.confirmationCode &&
    !/^[A-Z0-9-]{3,12}$/.test(value.confirmationCode)
  ) {
    return {
      ok: false,
      error: 'Confirmation codes must use 3–12 letters, numbers, or hyphens.',
    };
  }
  if (value?.departureAirport && value.departureAirport.length > 8) {
    return { ok: false, error: 'Use an airport code or short departure airport name.' };
  }
  if (value?.arrivalAirport && value.arrivalAirport.length > 8) {
    return { ok: false, error: 'Use an airport code or short arrival airport name.' };
  }
  return { ok: true, value };
}
