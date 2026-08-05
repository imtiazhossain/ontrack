import { formatDuration } from '@/utils/date';

import { normalizeConfirmationUris } from './confirmation-attachments';
import { normalizeFlightLegs } from './flight-journey-model';
import type { TravelFlightDetails, TravelFlightLeg } from './types';

export interface FlightDetailsDraft {
  airline: string;
  flightNumber: string;
  confirmationCode: string;
  departureAirport: string;
  departureTerminal: string;
  departureGate: string;
  arrivalAirport: string;
  arrivalTerminal: string;
  arrivalGate: string;
  seat: string;
  /** Lead traveler on the booking. */
  passengerName?: string;
  /** Travelers covered by the booking, as typed/imported text. */
  passengerCount?: string;
  layoverMinutesAfter?: string;
  /** Connection airport code when a layover follows this leg (e.g. IAH). */
  connectionAirport?: string;
  /** Local minutes from midnight when the connecting arrival lands. */
  connectionArrivalMinutes?: number;
  /** Local minutes from midnight when the onward flight departs. */
  connectionDepartureMinutes?: number;
  /** Per-leg itinerary for connecting trips (from confirmation import). */
  legs?: TravelFlightLeg[];
  confirmationUris?: string[];
}

export function formatLayoverDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';
  return formatDuration(Math.round(totalMinutes));
}

function parseLayoverDuration(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;

  // Keep accepting the old total-minutes draft format during migration.
  if (/^\d+$/.test(text)) {
    const minutes = Number(text);
    return minutes > 0 ? minutes : undefined;
  }

  const match = text.match(
    /^(?:(\d+)\s*h(?:ours?)?)?(?:\s*(\d+)\s*m(?:in(?:ute)?s?)?)?$/i,
  );
  if (!match || (!match[1] && !match[2])) return undefined;
  const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  return minutes > 0 ? minutes : undefined;
}

export function emptyFlightDetailsDraft(): FlightDetailsDraft {
  return {
    airline: '',
    flightNumber: '',
    confirmationCode: '',
    departureAirport: '',
    departureTerminal: '',
    departureGate: '',
    arrivalAirport: '',
    arrivalTerminal: '',
    arrivalGate: '',
    seat: '',
    connectionAirport: '',
  };
}

function optionalText(value: unknown, uppercase = false): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return uppercase ? trimmed.toUpperCase() : trimmed;
}

/** Traveler counts stay small so a bad OCR read never renders "204 Travelers". */
function optionalPassengerCount(value: unknown): number | undefined {
  const count =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d{1,2}$/.test(value.trim())
        ? Number(value.trim())
        : undefined;
  if (count === undefined || !Number.isFinite(count)) return undefined;
  const rounded = Math.round(count);
  return rounded >= 1 && rounded <= 20 ? rounded : undefined;
}

function optionalDayMinutes(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const minutes = Math.round(value);
    return minutes >= 0 && minutes < 24 * 60 ? minutes : undefined;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const minutes = Number(value.trim());
    return minutes >= 0 && minutes < 24 * 60 ? minutes : undefined;
  }
  return undefined;
}

export function flightDetailsDraft(
  value?: TravelFlightDetails,
): FlightDetailsDraft {
  return {
    airline: value?.airline ?? '',
    flightNumber: value?.flightNumber ?? '',
    confirmationCode: value?.confirmationCode ?? '',
    departureAirport: value?.departureAirport ?? '',
    departureTerminal: value?.departureTerminal ?? '',
    departureGate: value?.departureGate ?? '',
    arrivalAirport: value?.arrivalAirport ?? '',
    arrivalTerminal: value?.arrivalTerminal ?? '',
    arrivalGate: value?.arrivalGate ?? '',
    seat: value?.seat ?? '',
    connectionAirport: value?.connectionAirport ?? '',
    ...(value?.passengerName ? { passengerName: value.passengerName } : {}),
    ...(value?.passengerCount !== undefined
      ? { passengerCount: String(value.passengerCount) }
      : {}),
    ...(value?.layoverMinutesAfter
      ? {
          layoverMinutesAfter: formatLayoverDuration(
            value.layoverMinutesAfter,
          ),
        }
      : {}),
    ...(value?.connectionArrivalMinutes !== undefined
      ? { connectionArrivalMinutes: value.connectionArrivalMinutes }
      : {}),
    ...(value?.connectionDepartureMinutes !== undefined
      ? { connectionDepartureMinutes: value.connectionDepartureMinutes }
      : {}),
    ...(value?.legs?.length ? { legs: value.legs } : {}),
    ...(value?.confirmationUris?.length
      ? { confirmationUris: value.confirmationUris }
      : {}),
  };
}

export function normalizeFlightDetails(
  value: unknown,
): TravelFlightDetails | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<Record<keyof TravelFlightDetails, unknown>>;
  const confirmationUris = normalizeConfirmationUris(input.confirmationUris);
  const normalized: TravelFlightDetails = {
    airline: optionalText(input.airline),
    flightNumber: optionalText(input.flightNumber, true),
    confirmationCode: optionalText(input.confirmationCode, true),
    departureAirport: optionalText(input.departureAirport, true),
    departureTerminal: optionalText(input.departureTerminal, true),
    departureGate: optionalText(input.departureGate, true),
    arrivalAirport: optionalText(input.arrivalAirport, true),
    arrivalTerminal: optionalText(input.arrivalTerminal, true),
    arrivalGate: optionalText(input.arrivalGate, true),
    seat: optionalText(input.seat, true),
    passengerName: optionalText(input.passengerName),
    connectionAirport: optionalText(input.connectionAirport, true),
    ...(() => {
      const count = optionalPassengerCount(input.passengerCount);
      return count !== undefined ? { passengerCount: count } : {};
    })(),
    ...(() => {
      const minutes = parseLayoverDuration(input.layoverMinutesAfter);
      return minutes !== undefined
        ? { layoverMinutesAfter: minutes }
        : {};
    })(),
    ...(() => {
      const minutes = optionalDayMinutes(input.connectionArrivalMinutes);
      return minutes !== undefined
        ? { connectionArrivalMinutes: minutes }
        : {};
    })(),
    ...(() => {
      const minutes = optionalDayMinutes(input.connectionDepartureMinutes);
      return minutes !== undefined
        ? { connectionDepartureMinutes: minutes }
        : {};
    })(),
    ...(() => {
      const legs = normalizeFlightLegs(input.legs);
      return legs ? { legs } : {};
    })(),
    ...(confirmationUris ? { confirmationUris } : {}),
  };
  return Object.values(normalized).some((field) =>
    Array.isArray(field) ? field.length > 0 : Boolean(field),
  )
    ? normalized
    : undefined;
}

export function validateFlightDetails(
  draft: FlightDetailsDraft,
):
  | { ok: true; value: TravelFlightDetails | undefined }
  | { ok: false; error: string } {
  const value = normalizeFlightDetails(draft);
  const layoverText = draft.layoverMinutesAfter?.trim() ?? '';
  const layoverMinutes = parseLayoverDuration(layoverText);
  if (
    layoverText &&
    (layoverMinutes === undefined || layoverMinutes > 7 * 24 * 60)
  ) {
    return {
      ok: false,
      error: 'Use a layover like 1h 39m, up to 168 hours.',
    };
  }
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
    return {
      ok: false,
      error: 'Use an airport code or short departure airport name.',
    };
  }
  if (value?.departureTerminal && value.departureTerminal.length > 24) {
    return {
      ok: false,
      error: 'Use a departure terminal name up to 24 characters.',
    };
  }
  if (value?.arrivalAirport && value.arrivalAirport.length > 8) {
    return {
      ok: false,
      error: 'Use an airport code or short arrival airport name.',
    };
  }
  if (value?.arrivalTerminal && value.arrivalTerminal.length > 24) {
    return {
      ok: false,
      error: 'Use an arrival terminal name up to 24 characters.',
    };
  }
  if (
    (value?.departureGate && value.departureGate.length > 12) ||
    (value?.arrivalGate && value.arrivalGate.length > 12)
  ) {
    return { ok: false, error: 'Use a gate up to 12 characters.' };
  }
  if (value?.connectionAirport && value.connectionAirport.length > 8) {
    return {
      ok: false,
      error: 'Use an airport code or short connection airport name.',
    };
  }
  return { ok: true, value };
}
