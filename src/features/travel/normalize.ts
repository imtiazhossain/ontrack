import { asPositiveNumber, asString } from '@/utils/parse';
import { normalizeCurrencyCode } from './expenses/format-money';
import { normalizeFlightDetails } from './flight-details';
import type {
  TravelExpense,
  TravelExpenseCategory,
  TravelItineraryItem,
  TravelParticipant,
  TravelPlan,
} from './types';
import { TRAVEL_EXPENSE_SELF_ID } from './types';

const EXPENSE_CATEGORIES = new Set<TravelExpenseCategory>([
  'flight',
  'stay',
  'food',
  'transport',
  'activity',
  'shopping',
  'other',
]);

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
    details: asString(item.details),
    bookingUrl: asString(item.bookingUrl),
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

function repairLegacyIcelandairRoundTripImport(
  itinerary: TravelItineraryItem[],
): { itinerary: TravelItineraryItem[]; correctedEndDate?: string } {
  const outbound = itinerary.find(
    (item) =>
      item.kind === 'flight' &&
      item.date === '2026-09-08' &&
      item.startMinutes === 20 * 60 + 25 &&
      item.durationMinutes === 5 * 60 + 50 &&
      item.flight?.flightNumber === 'FI 622' &&
      item.flight.departureAirport === 'EWR' &&
      item.flight.arrivalAirport === 'KEF',
  );
  const legacyReturn = itinerary.find(
    (item) =>
      item.kind === 'flight' &&
      item.date === '2026-09-13' &&
      item.startMinutes === 17 * 60 &&
      item.durationMinutes === 6 * 60 + 15 &&
      item.flight?.flightNumber === 'FI 623' &&
      item.flight.departureAirport === 'EWR' &&
      item.flight.arrivalAirport === 'KEF',
  );
  if (!outbound || !legacyReturn) return { itinerary };

  return {
    itinerary: itinerary.map((item) =>
      item.id === legacyReturn.id
        ? {
            ...item,
            title: 'Flight KEF → EWR',
            date: '2026-09-14',
            flight: {
              ...item.flight,
              departureAirport: 'KEF',
              arrivalAirport: 'EWR',
            },
          }
        : item,
    ),
    correctedEndDate: '2026-09-14',
  };
}

export function normalizeTravelParticipants(value: unknown): TravelParticipant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const participant = candidate as Partial<TravelParticipant>;
    if (
      typeof participant.id !== 'string' ||
      typeof participant.name !== 'string' ||
      !participant.name.trim() ||
      typeof participant.inviteCode !== 'string' ||
      !/^[a-f0-9]{20}$/.test(participant.inviteCode) ||
      typeof participant.invitedAt !== 'string'
    ) {
      return [];
    }
    return [{
      id: participant.id,
      name: participant.name.trim(),
      email: asString(participant.email)?.trim() || undefined,
      inviteCode: participant.inviteCode,
      invitedAt: participant.invitedAt,
      acceptedAt: asString(participant.acceptedAt),
    }];
  });
}

function normalizeExpenseCategory(value: unknown): TravelExpenseCategory | undefined {
  return typeof value === 'string' && EXPENSE_CATEGORIES.has(value as TravelExpenseCategory)
    ? (value as TravelExpenseCategory)
    : undefined;
}

export function normalizeTravelExpense(
  value: unknown,
  participantIds: Set<string>,
): TravelExpense | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const expense = value as Partial<TravelExpense>;
  const amount = asPositiveNumber(expense.amount);
  const category = normalizeExpenseCategory(expense.category);
  const currency = normalizeCurrencyCode(expense.currency, '');
  if (
    typeof expense.id !== 'string' ||
    typeof expense.title !== 'string' ||
    !expense.title.trim() ||
    amount === undefined ||
    !currency ||
    typeof expense.date !== 'string' ||
    !category ||
    typeof expense.paidById !== 'string'
  ) {
    return undefined;
  }

  const allowedPayer =
    expense.paidById === TRAVEL_EXPENSE_SELF_ID || participantIds.has(expense.paidById);
  if (!allowedPayer) return undefined;

  const splitWithIds = Array.isArray(expense.splitWithIds)
    ? expense.splitWithIds.filter(
        (id): id is string =>
          typeof id === 'string' &&
          (id === TRAVEL_EXPENSE_SELF_ID || participantIds.has(id)),
      )
    : [];
  const resolvedSplit = splitWithIds.length > 0 ? [...new Set(splitWithIds)] : [expense.paidById];
  const fallbackTimestamp = new Date().toISOString();

  return {
    id: expense.id,
    title: expense.title.trim(),
    amount,
    currency,
    date: expense.date,
    category,
    notes: asString(expense.notes)?.trim() || undefined,
    paidById: expense.paidById,
    splitWithIds: resolvedSplit,
    createdAt: asString(expense.createdAt) ?? asString(expense.updatedAt) ?? fallbackTimestamp,
    updatedAt: asString(expense.updatedAt) ?? asString(expense.createdAt) ?? fallbackTimestamp,
  };
}

export function normalizeTravelExpenses(
  value: unknown,
  participants: TravelParticipant[],
): TravelExpense[] {
  if (!Array.isArray(value)) return [];
  const participantIds = new Set(participants.map((p) => p.id));
  return value.flatMap((item) => {
    const normalized = normalizeTravelExpense(item, participantIds);
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
  const repairedImport = repairLegacyIcelandairRoundTripImport(
    normalizeTravelItinerary(plan.itinerary),
  );
  const participants = normalizeTravelParticipants(plan.participants);
  return {
    id: plan.id,
    ...(typeof plan.chatAccessCode === 'string' &&
    /^[a-f0-9]{20}$/.test(plan.chatAccessCode)
      ? { chatAccessCode: plan.chatAccessCode }
      : {}),
    title: plan.title,
    destination: plan.destination,
    startDate: plan.startDate,
    endDate:
      repairedImport.correctedEndDate &&
      repairedImport.correctedEndDate > plan.endDate
        ? repairedImport.correctedEndDate
        : plan.endDate,
    notes: asString(plan.notes),
    itinerary: repairedImport.itinerary,
    participants,
    baseCurrency: normalizeCurrencyCode(plan.baseCurrency),
    expenses: normalizeTravelExpenses(plan.expenses, participants),
    createdAt: asString(plan.createdAt) ?? asString(plan.updatedAt) ?? fallbackTimestamp,
    updatedAt: asString(plan.updatedAt) ?? asString(plan.createdAt) ?? fallbackTimestamp,
  };
}

export function normalizeTravelPlans(value: unknown): TravelPlan[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((plan) => {
    const normalized = normalizeTravelPlan(plan);
    return normalized ? [normalized] : [];
  });
}
