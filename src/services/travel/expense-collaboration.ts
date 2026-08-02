import { travelChatAccessCode } from '@/features/travel/chat';
import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import { normalizeTravelExpense } from '@/features/travel/normalize';
import {
  TRAVEL_EXPENSE_HOST_ID,
  TRAVEL_EXPENSE_SELF_ID,
  type TravelExpense,
  type TravelPlan,
} from '@/features/travel/types';
import { getSupabaseClient } from '@/services/cloud/supabase';
import { usePreferences } from '@/store/preferences';
import { useTravel } from '@/store/travel';
import { asNonEmptyString, asString } from '@/utils/parse';

export class TravelExpenseCollaborationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TravelExpenseCollaborationError';
  }
}

export type SharedExpensePerson = { id: string; name: string };

export type TravelExpenseSnapshot = {
  tripId: string;
  expenses: TravelExpense[];
  people: SharedExpensePerson[];
  baseCurrency: string;
  updatedAt: string;
  stale?: boolean;
};

const MEMBER_ID_PREFIX = 'member:';

export function travelExpenseMemberId(userId: string): string {
  return `${MEMBER_ID_PREFIX}${userId}`;
}

export function isTravelExpenseMemberId(id: string): boolean {
  return id.startsWith(MEMBER_ID_PREFIX);
}

/** Member copies joined via invite/open-join (not the host's canonical plan). */
export function isTravelExpenseMemberPlan(
  plan: Pick<TravelPlan, 'id' | 'chatAccessCode' | 'hostTripId'>,
): boolean {
  if (plan.chatAccessCode) return true;
  const hostTripId = plan.hostTripId?.trim();
  if (!hostTripId) return false;
  return hostTripId !== plan.id;
}

export function sharedExpenseTripId(plan: TravelPlan): string | undefined {
  if (plan.hostTripId?.trim()) return plan.hostTripId.trim();
  if (!isTravelExpenseMemberPlan(plan)) return plan.id;
  return undefined;
}

function messageFrom(error: { message?: string } | null, fallback: string) {
  return error?.message?.trim() || fallback;
}

async function authenticatedClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new TravelExpenseCollaborationError(
      'Shared trip expenses are not configured for this build.',
    );
  }
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    throw new TravelExpenseCollaborationError('Sign in to sync trip expenses.');
  }
  return { client, userId: data.session.user.id, user: data.session.user };
}

function hostDisplayNameFromSession(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const prefsName = usePreferences.getState().name.trim();
  if (prefsName) return prefsName;
  const meta = user.user_metadata ?? {};
  const fullName = asNonEmptyString(meta.full_name) ?? asNonEmptyString(meta.name);
  if (fullName) return fullName;
  const email = asString(user.email)?.trim();
  if (email) return email.split('@')[0] || 'Host';
  return 'Host';
}

function parsePeople(value: unknown): SharedExpensePerson[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const id = asNonEmptyString((row as { id?: unknown }).id);
    const name = asNonEmptyString((row as { name?: unknown }).name);
    return id && name ? [{ id, name }] : [];
  });
}

function parseSnapshot(value: unknown): TravelExpenseSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const tripId = asNonEmptyString(row.tripId);
  const updatedAt = asString(row.updatedAt);
  const people = parsePeople(row.people);
  const participantIds = new Set(
    people
      .filter((person) => person.id !== TRAVEL_EXPENSE_SELF_ID)
      .map((person) => person.id),
  );
  const expenses = Array.isArray(row.expenses)
    ? row.expenses.flatMap((item) => {
        const normalized = normalizeTravelExpense(item, participantIds);
        return normalized ? [normalized] : [];
      })
    : [];
  if (!tripId || !updatedAt) return undefined;
  return {
    tripId,
    expenses,
    people,
    baseCurrency: normalizeCurrencyCode(row.baseCurrency),
    updatedAt,
    stale: row.stale === true,
  };
}

function remapExpenseIds(
  expense: TravelExpense,
  mapId: (id: string) => string,
): TravelExpense {
  return {
    ...expense,
    paidById: mapId(expense.paidById),
    splitWithIds: expense.splitWithIds.map(mapId),
  };
}

/**
 * Shared document: `self` = host. Members remap local `self` ↔ `member:<uid>`
 * and local `host` ↔ shared `self`.
 */
export function expensesForPublish(
  plan: TravelPlan,
  localUserId: string | undefined,
): TravelExpense[] {
  if (!isTravelExpenseMemberPlan(plan) || !localUserId) return plan.expenses;
  const memberId = travelExpenseMemberId(localUserId);
  return plan.expenses.map((expense) =>
    remapExpenseIds(expense, (id) => {
      if (id === TRAVEL_EXPENSE_SELF_ID) return memberId;
      if (id === TRAVEL_EXPENSE_HOST_ID) return TRAVEL_EXPENSE_SELF_ID;
      return id;
    }),
  );
}

export function expensesFromRemote(
  expenses: TravelExpense[],
  localUserId: string | undefined,
  asMember: boolean,
): TravelExpense[] {
  if (!asMember || !localUserId) return expenses;
  const memberId = travelExpenseMemberId(localUserId);
  return expenses.map((expense) =>
    remapExpenseIds(expense, (id) => {
      if (id === memberId) return TRAVEL_EXPENSE_SELF_ID;
      if (id === TRAVEL_EXPENSE_SELF_ID) return TRAVEL_EXPENSE_HOST_ID;
      return id;
    }),
  );
}

export function peopleForPublish(
  plan: TravelPlan,
  hostName: string,
  localUserId: string | undefined,
): SharedExpensePerson[] {
  const people: SharedExpensePerson[] = [
    { id: TRAVEL_EXPENSE_SELF_ID, name: hostName },
  ];
  for (const participant of plan.participants) {
    if (!people.some((person) => person.id === participant.id)) {
      people.push({ id: participant.id, name: participant.name });
    }
  }
  for (const person of plan.sharedExpensePeople ?? []) {
    if (
      person.id === TRAVEL_EXPENSE_HOST_ID ||
      person.id === TRAVEL_EXPENSE_SELF_ID
    ) {
      continue;
    }
    const publishId =
      isTravelExpenseMemberPlan(plan) &&
      localUserId &&
      person.id === TRAVEL_EXPENSE_SELF_ID
        ? travelExpenseMemberId(localUserId)
        : person.id;
    if (!people.some((entry) => entry.id === publishId)) {
      people.push({ id: publishId, name: person.name });
    }
  }
  if (isTravelExpenseMemberPlan(plan) && localUserId) {
    const memberId = travelExpenseMemberId(localUserId);
    const memberName = usePreferences.getState().name.trim() || 'Traveler';
    if (!people.some((person) => person.id === memberId)) {
      people.push({ id: memberId, name: memberName });
    }
  }
  return people;
}

/** Remap shared roster ids onto a member device (`self`→host, `member:me`→self). */
export function peopleFromRemote(
  people: SharedExpensePerson[],
  localUserId: string | undefined,
  asMember: boolean,
): SharedExpensePerson[] {
  if (!asMember || !localUserId) return people;
  const memberId = travelExpenseMemberId(localUserId);
  return people.map((person) => {
    if (person.id === memberId) return { ...person, id: TRAVEL_EXPENSE_SELF_ID };
    if (person.id === TRAVEL_EXPENSE_SELF_ID) {
      return { ...person, id: TRAVEL_EXPENSE_HOST_ID };
    }
    return person;
  });
}

export function mergeSharedExpenseSnapshot(
  plan: TravelPlan,
  snapshot: TravelExpenseSnapshot,
  localUserId: string | undefined,
): TravelPlan | undefined {
  const remoteUpdatedAt = snapshot.updatedAt;
  const localUpdatedAt = plan.sharedExpensesUpdatedAt;
  const asMember = isTravelExpenseMemberPlan(plan) || Boolean(plan.chatAccessCode);

  if (
    localUpdatedAt &&
    localUpdatedAt >= remoteUpdatedAt &&
    !snapshot.stale &&
    plan.hostTripId === snapshot.tripId
  ) {
    return undefined;
  }

  const hostPerson = snapshot.people.find(
    (person) => person.id === TRAVEL_EXPENSE_SELF_ID,
  );
  const sharedExpensePeople = peopleFromRemote(
    snapshot.people,
    localUserId,
    asMember,
  );
  const expenses = expensesFromRemote(snapshot.expenses, localUserId, asMember);

  return {
    ...plan,
    hostTripId: snapshot.tripId,
    hostDisplayName: hostPerson?.name ?? plan.hostDisplayName,
    sharedExpensePeople,
    sharedExpensesUpdatedAt: remoteUpdatedAt,
    baseCurrency: snapshot.baseCurrency || plan.baseCurrency,
    expenses,
    updatedAt: new Date().toISOString(),
  };
}

export function shouldSyncTravelExpenses(plan: TravelPlan): boolean {
  return Boolean(
    plan.participants.length > 0 ||
      plan.chatAccessCode ||
      plan.openJoinCode ||
      plan.hostTripId,
  );
}

export async function publishTravelTripExpenses(
  plan: TravelPlan,
): Promise<TravelExpenseSnapshot | undefined> {
  if (!shouldSyncTravelExpenses(plan)) return undefined;
  const { client, userId, user } = await authenticatedClient();
  let tripId = sharedExpenseTripId(plan);
  if (!tripId) {
    const access = travelChatAccessCode(plan);
    if (!access) return undefined;
    const { data: mapped } = await client.rpc('travel_trip_id_for_access', {
      access_code: access,
    });
    if (typeof mapped !== 'string' || !mapped.trim()) return undefined;
    tripId = mapped.trim();
  }

  const asMember = isTravelExpenseMemberPlan(plan);
  const hostName = asMember
    ? plan.hostDisplayName?.trim() || 'Host'
    : hostDisplayNameFromSession(user);
  const updatedAt = new Date().toISOString();
  const { data, error } = await client.rpc('publish_travel_trip_expenses', {
    requested_trip_id: tripId,
    requested_expenses: expensesForPublish(plan, userId),
    requested_people: peopleForPublish(plan, hostName, asMember ? userId : undefined),
    requested_base_currency: plan.baseCurrency,
    requested_updated_at: updatedAt,
  });
  if (error) {
    throw new TravelExpenseCollaborationError(
      messageFrom(error, 'Trip expenses could not be shared.'),
    );
  }
  const snapshot = parseSnapshot(data);
  if (!snapshot) return undefined;

  const merged = mergeSharedExpenseSnapshot(
    { ...plan, hostTripId: tripId, chatAccessCode: plan.chatAccessCode },
    snapshot,
    userId,
  );
  if (merged) {
    useTravel.getState().savePlan(merged);
  } else {
    useTravel.getState().savePlan({
      ...plan,
      hostTripId: tripId,
      sharedExpensesUpdatedAt: snapshot.updatedAt,
      hostDisplayName: asMember ? plan.hostDisplayName : hostName,
      updatedAt: new Date().toISOString(),
    });
  }
  return snapshot;
}

export async function pullTravelTripExpenses(
  plan: TravelPlan,
): Promise<TravelPlan | undefined> {
  if (!shouldSyncTravelExpenses(plan)) return undefined;
  const { client, userId } = await authenticatedClient();
  const tripId = sharedExpenseTripId(plan);
  const access = travelChatAccessCode(plan);

  let data: unknown;
  let error: { message?: string } | null = null;
  if (access && isTravelExpenseMemberPlan(plan)) {
    ({ data, error } = await client.rpc('fetch_travel_trip_expenses_by_access', {
      access_code: access,
    }));
  } else if (tripId) {
    ({ data, error } = await client.rpc('fetch_travel_trip_expenses', {
      requested_trip_id: tripId,
    }));
  } else if (access) {
    ({ data, error } = await client.rpc('fetch_travel_trip_expenses_by_access', {
      access_code: access,
    }));
  } else {
    return undefined;
  }

  if (error) {
    throw new TravelExpenseCollaborationError(
      messageFrom(error, 'Trip expenses could not be refreshed.'),
    );
  }
  if (data == null) return undefined;
  const snapshot = parseSnapshot(data);
  if (!snapshot) return undefined;
  const merged = mergeSharedExpenseSnapshot(plan, snapshot, userId);
  if (!merged) return undefined;
  useTravel.getState().savePlan(merged);
  return merged;
}

export async function pullAllTravelTripExpenses(): Promise<void> {
  const plans = useTravel.getState().plans.filter(shouldSyncTravelExpenses);
  await Promise.all(
    plans.map((plan) => pullTravelTripExpenses(plan).catch(() => undefined)),
  );
}
