import { normalizeConfirmationUris } from './confirmation-attachments';
import type { TravelFlightDetails } from './types';

export interface FlightDetailsDraft {
  airline: string;
  flightNumber: string;
  confirmationCode: string;
  departureAirport: string;
  arrivalAirport: string;
  seat: string;
  layoverMinutesAfter?: string;
  confirmationUris?: string[];
}

export function formatLayoverDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : '']
    .filter(Boolean)
    .join(' ');
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
    ...(value?.layoverMinutesAfter
      ? {
          layoverMinutesAfter: formatLayoverDuration(
            value.layoverMinutesAfter,
          ),
        }
      : {}),
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
    arrivalAirport: optionalText(input.arrivalAirport, true),
    seat: optionalText(input.seat, true),
    ...(() => {
      const minutes = parseLayoverDuration(input.layoverMinutesAfter);
      return minutes !== undefined
        ? { layoverMinutesAfter: minutes }
        : {};
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
  if (value?.arrivalAirport && value.arrivalAirport.length > 8) {
    return {
      ok: false,
      error: 'Use an airport code or short arrival airport name.',
    };
  }
  return { ok: true, value };
}
