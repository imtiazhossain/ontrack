import { isDateKey } from '@/utils/date';

import { normalizeConfirmationUris } from './confirmation-attachments';
import type { TravelRentalDetails } from './types';

export interface RentalDetailsDraft {
  company: string;
  confirmationCode: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicleClass: string;
  dropoffDate: string;
  dropoffMinutes: string;
  confirmationUris?: string[];
}

export function emptyRentalDetailsDraft(): RentalDetailsDraft {
  return {
    company: '',
    confirmationCode: '',
    pickupLocation: '',
    dropoffLocation: '',
    vehicleClass: '',
    dropoffDate: '',
    dropoffMinutes: '',
  };
}

function optionalText(value: unknown, uppercase = false): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return uppercase ? trimmed.toUpperCase() : trimmed;
}

export function rentalDetailsDraft(value?: TravelRentalDetails): RentalDetailsDraft {
  return {
    company: value?.company ?? '',
    confirmationCode: value?.confirmationCode ?? '',
    pickupLocation: value?.pickupLocation ?? '',
    dropoffLocation: value?.dropoffLocation ?? '',
    vehicleClass: value?.vehicleClass ?? '',
    dropoffDate: value?.dropoffDate ?? '',
    dropoffMinutes:
      value?.dropoffMinutes !== undefined ? String(value.dropoffMinutes) : '',
    ...(value?.confirmationUris?.length
      ? { confirmationUris: value.confirmationUris }
      : {}),
  };
}

function optionalMinutes(value: unknown): number | undefined {
  const raw =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : typeof value === 'string' && value.trim()
        ? Math.round(Number(value.trim()))
        : undefined;
  if (
    raw === undefined ||
    !Number.isFinite(raw) ||
    raw < 0 ||
    raw >= 24 * 60
  ) {
    return undefined;
  }
  return raw;
}

export function normalizeRentalDetails(value: unknown): TravelRentalDetails | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<Record<keyof TravelRentalDetails, unknown>>;
  const dropoffMinutesRaw = optionalMinutes(input.dropoffMinutes);
  const dropoffDate = optionalText(input.dropoffDate);
  const confirmationUris = normalizeConfirmationUris(input.confirmationUris);
  const normalized: TravelRentalDetails = {
    company: optionalText(input.company),
    confirmationCode: optionalText(input.confirmationCode, true),
    pickupLocation: optionalText(input.pickupLocation),
    dropoffLocation: optionalText(input.dropoffLocation),
    vehicleClass: optionalText(input.vehicleClass),
    dropoffDate: dropoffDate && isDateKey(dropoffDate) ? dropoffDate : undefined,
    dropoffMinutes: dropoffMinutesRaw,
    ...(confirmationUris ? { confirmationUris } : {}),
  };
  return Object.values(normalized).some((field) =>
    Array.isArray(field) ? field.length > 0 : field !== undefined,
  )
    ? normalized
    : undefined;
}

export function validateRentalDetails(
  draft: RentalDetailsDraft,
):
  | { ok: true; value: TravelRentalDetails | undefined }
  | { ok: false; error: string } {
  const dropoffMinutesText = draft.dropoffMinutes.trim();
  let dropoffMinutes: number | undefined;
  if (dropoffMinutesText) {
    dropoffMinutes = Number(dropoffMinutesText);
    if (
      !Number.isFinite(dropoffMinutes) ||
      dropoffMinutes < 0 ||
      dropoffMinutes >= 24 * 60
    ) {
      return { ok: false, error: 'Drop-off time must be a valid time of day.' };
    }
  }
  const value = normalizeRentalDetails({
    ...draft,
    dropoffMinutes,
  });
  if (
    value?.confirmationCode &&
    !/^[A-Z0-9-]{3,20}$/.test(value.confirmationCode)
  ) {
    return {
      ok: false,
      error: 'Confirmation codes must use 3–20 letters, numbers, or hyphens.',
    };
  }
  if (draft.dropoffDate.trim() && !isDateKey(draft.dropoffDate.trim())) {
    return { ok: false, error: 'Use a valid drop-off date.' };
  }
  return { ok: true, value };
}
