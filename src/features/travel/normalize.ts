import { normalizeFlightDetails } from './flight-details';
import type { TravelItineraryItem, TravelPlan } from './types';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function normalizeTravelItineraryItem(
  value: unknown,
): TravelItineraryItem | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Partial<TravelItineraryItem>;
  if (
    typeof item.id !== 'string' ||
    (item.kind !== 'flight' && item.kind !== 'stay' && item.kind !== 'activity') ||
    typeof item.title !== 'string' ||
    typeof item.date !== 'string' ||
    typeof item.startMinutes !== 'number' ||
    !Number.isFinite(item.startMinutes) ||
    item.startMinutes < 0 ||
    item.startMinutes >= 24 * 60 ||
    typeof item.durationMinutes !== 'number' ||
    !Number.isFinite(item.durationMinutes) ||
    item.durationMinutes <= 0
  ) {
    return undefined;
  }
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    date: item.date,
    startMinutes: Math.round(item.startMinutes),
    durationMinutes: Math.round(item.durationMinutes),
    details: stringValue(item.details),
    bookingUrl: stringValue(item.bookingUrl),
    flight: item.kind === 'flight' ? normalizeFlightDetails(item.flight) : undefined,
  };
}

export function normalizeTravelItinerary(value: unknown): TravelItineraryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeTravelItineraryItem(item);
    return normalized ? [normalized] : [];
  });
}

export function normalizeTravelPlan(value: unknown): TravelPlan | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const plan = value as Partial<TravelPlan>;
  if (
    typeof plan.id !== 'string' ||
    typeof plan.title !== 'string' ||
    typeof plan.destination !== 'string' ||
    typeof plan.startDate !== 'string' ||
    typeof plan.endDate !== 'string'
  ) {
    return undefined;
  }
  const fallbackTimestamp = new Date().toISOString();
  return {
    id: plan.id,
    title: plan.title,
    destination: plan.destination,
    startDate: plan.startDate,
    endDate: plan.endDate,
    notes: stringValue(plan.notes),
    itinerary: normalizeTravelItinerary(plan.itinerary),
    createdAt: stringValue(plan.createdAt) ?? stringValue(plan.updatedAt) ?? fallbackTimestamp,
    updatedAt: stringValue(plan.updatedAt) ?? stringValue(plan.createdAt) ?? fallbackTimestamp,
  };
}

export function normalizeTravelPlans(value: unknown): TravelPlan[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((plan) => {
    const normalized = normalizeTravelPlan(plan);
    return normalized ? [normalized] : [];
  });
}
