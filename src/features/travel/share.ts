import { Share } from 'react-native';

import { getSupabaseClient } from '@/services/cloud/supabase';
import { formatDateLong } from '@/utils/date';

import { normalizeTravelItinerary } from './normalize';
import type {
  TravelFlightDetails,
  TravelItineraryItem,
  TravelItemKind,
  TravelPlan,
} from './types';

export const ONTRACK_APP_STORE_URL = 'https://apps.apple.com/app/id6789723522';
export const ONTRACK_TRAVEL_SHARE_URL = 'https://ontrack--links.expo.app';
const SHORT_INVITE_PREFIX = 's.';

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function encodeBase64Url(value: string): string {
  const escaped = encodeURIComponent(value);
  const bytes: number[] = [];
  for (let index = 0; index < escaped.length; index += 1) {
    if (escaped[index] === '%') {
      bytes.push(Number.parseInt(escaped.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(escaped.charCodeAt(index));
    }
  }

  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    result += BASE64URL_ALPHABET[first >> 2];
    result += BASE64URL_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)];
    if (second !== undefined) {
      result += BASE64URL_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)];
    }
    if (third !== undefined) result += BASE64URL_ALPHABET[third & 63];
  }
  return result;
}

function decodeBase64Url(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid base64url value');
  }

  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 4) {
    const first = BASE64URL_ALPHABET.indexOf(value[index]);
    const second = BASE64URL_ALPHABET.indexOf(value[index + 1]);
    const third = value[index + 2] ? BASE64URL_ALPHABET.indexOf(value[index + 2]) : 0;
    const fourth = value[index + 3] ? BASE64URL_ALPHABET.indexOf(value[index + 3]) : 0;
    bytes.push((first << 2) | (second >> 4));
    if (value[index + 2]) bytes.push(((second & 15) << 4) | (third >> 2));
    if (value[index + 3]) bytes.push(((third & 3) << 6) | fourth);
  }

  return decodeURIComponent(bytes.map((byte) => `%${byte.toString(16).padStart(2, '0')}`).join(''));
}

function compactFlightDetails(details?: TravelFlightDetails) {
  if (!details) return undefined;
  return [
    details.airline,
    details.flightNumber,
    details.confirmationCode,
    details.departureAirport,
    details.arrivalAirport,
    details.seat,
  ];
}

function compactItineraryItem(item: TravelItineraryItem) {
  const kind: Record<TravelItemKind, string> = { flight: 'f', stay: 's', activity: 'a' };
  return [
    item.id,
    kind[item.kind],
    item.title,
    item.date,
    item.startMinutes,
    item.durationMinutes,
    item.details,
    item.bookingUrl,
    compactFlightDetails(item.flight),
  ];
}

export function encodeTravelInvite(plan: TravelPlan): string {
  const compactPlan = [
    plan.title,
    plan.destination,
    plan.startDate,
    plan.endDate,
    plan.notes,
    plan.itinerary.map(compactItineraryItem),
  ];
  return `2.${encodeBase64Url(JSON.stringify(compactPlan))}`;
}

function stringAt(value: unknown[], index: number): string | undefined {
  return typeof value[index] === 'string' ? value[index] : undefined;
}

function expandItineraryItem(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const kind = { f: 'flight', s: 'stay', a: 'activity' }[stringAt(value, 1) ?? ''];
  const flight = Array.isArray(value[8])
    ? {
        airline: stringAt(value[8], 0),
        flightNumber: stringAt(value[8], 1),
        confirmationCode: stringAt(value[8], 2),
        departureAirport: stringAt(value[8], 3),
        arrivalAirport: stringAt(value[8], 4),
        seat: stringAt(value[8], 5),
      }
    : undefined;
  return {
    id: stringAt(value, 0),
    kind,
    title: stringAt(value, 2),
    date: stringAt(value, 3),
    startMinutes: value[4],
    durationMinutes: value[5],
    details: stringAt(value, 6),
    bookingUrl: stringAt(value, 7),
    flight,
  };
}

function decodeCompactTravelInvite(
  value: string,
): Omit<TravelPlan, 'id' | 'createdAt' | 'updatedAt'> | undefined {
  if (!value.startsWith('2.')) return undefined;
  const compact = JSON.parse(decodeBase64Url(value.slice(2))) as unknown;
  if (!Array.isArray(compact)) return undefined;

  const title = stringAt(compact, 0);
  const destination = stringAt(compact, 1);
  const startDate = stringAt(compact, 2);
  const endDate = stringAt(compact, 3);
  if (!title || !destination || !startDate || !endDate) return undefined;

  return {
    title,
    destination,
    startDate,
    endDate,
    notes: stringAt(compact, 4),
    itinerary: normalizeTravelItinerary(
      Array.isArray(compact[5]) ? compact[5].map(expandItineraryItem) : [],
    ),
    participants: [],
  };
}

export function decodeTravelInvite(value: string): Omit<TravelPlan, 'id' | 'createdAt' | 'updatedAt'> | undefined {
  for (const candidate of [value, (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })()]) {
    try {
      const compact = decodeCompactTravelInvite(candidate);
      if (compact) return compact;

      // Keep version 1 links working after the compact link format ships.
      const parsed = JSON.parse(candidate) as {
      version?: number;
      plan?: Partial<TravelPlan>;
      };
      const plan = parsed.plan;
      if (
        parsed.version !== 1 ||
        !plan ||
        typeof plan.title !== 'string' ||
        typeof plan.destination !== 'string' ||
        typeof plan.startDate !== 'string' ||
        typeof plan.endDate !== 'string'
      ) {
        continue;
      }
      return {
        title: plan.title,
        destination: plan.destination,
        startDate: plan.startDate,
        endDate: plan.endDate,
        notes: typeof plan.notes === 'string' ? plan.notes : undefined,
        itinerary: normalizeTravelItinerary(plan.itinerary),
        participants: [],
      };
    } catch {
      // Try the other encoded/decoded representation.
    }
  }
  return undefined;
}

/** Stable local key prevents the same shared link from creating duplicate trips. */
export function travelInviteKey(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

type TravelPlanIdentity = Pick<
  TravelPlan,
  'title' | 'destination' | 'startDate' | 'endDate'
>;

function normalizeTravelIdentityText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function travelPlanIdentity(plan: TravelPlanIdentity): string {
  return JSON.stringify([
    normalizeTravelIdentityText(plan.title),
    normalizeTravelIdentityText(plan.destination),
    plan.startDate,
    plan.endDate,
  ]);
}

export function travelPlanIdentityKey(plan: TravelPlanIdentity): string {
  return travelInviteKey(travelPlanIdentity(plan));
}

export function findMatchingTravelPlan(
  plans: TravelPlan[],
  candidate: TravelPlanIdentity,
): TravelPlan | undefined {
  const identity = travelPlanIdentity(candidate);
  return plans.find((plan) => travelPlanIdentity(plan) === identity);
}

export class TravelInviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TravelInviteError';
  }
}

async function requireAuthenticatedInviteClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new TravelInviteError(
      'Short travel links are not configured for this build. Add the Supabase public URL and publishable key, then try again.',
    );
  }
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    throw new TravelInviteError(
      'Sign in to onTrack with the email address that was invited, then try again.',
    );
  }
  return client;
}

export function isShortTravelInvite(value: string): boolean {
  return /^s\.[a-f0-9]{20}$/.test(value);
}

export function createTravelInviteUrl(code: string, configuredBase?: string): string {
  const path = `/i/${code}`;
  const normalizedBase = (configuredBase || ONTRACK_TRAVEL_SHARE_URL).replace(/\/$/, '');
  return `${normalizedBase}${path}`;
}

export function createInstalledTravelInviteUrl(invite?: string): string {
  if (!invite) return 'ontrack:///travel';
  if (isShortTravelInvite(invite)) {
    return `ontrack:///i/${invite.slice(SHORT_INVITE_PREFIX.length)}`;
  }
  return `ontrack:///invite/travel?invite=${encodeURIComponent(invite)}`;
}

export interface TravelInvitee {
  name: string;
  email: string;
}

export async function publishTravelInvite(
  plan: TravelPlan,
  invitee: TravelInvitee,
): Promise<string> {
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('create_travel_invite', {
    invite_payload: { invite: encodeTravelInvite(plan) },
    invite_trip_id: plan.id,
    invitee_name: invitee.name.trim(),
    invitee_email: invitee.email.trim().toLowerCase(),
  });
  if (error || typeof data !== 'string' || !/^[a-f0-9]{20}$/.test(data)) {
    throw new TravelInviteError(
      error?.message ?? 'The invitation could not be created. Please try again.',
    );
  }
  return data;
}

export async function resolveTravelInvite(
  value: string,
): Promise<Omit<TravelPlan, 'id' | 'createdAt' | 'updatedAt'> | undefined> {
  if (!isShortTravelInvite(value)) return undefined;

  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('resolve_travel_invite', {
    invite_code: value.slice(SHORT_INVITE_PREFIX.length),
  });
  if (error) throw new TravelInviteError('This invitation could not be opened.');

  const payload =
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    typeof (data as { invite?: unknown }).invite === 'string'
      ? (data as { invite: string }).invite
      : undefined;
  return payload ? decodeTravelInvite(payload) : undefined;
}

export async function acceptTravelInvite(value: string): Promise<void> {
  if (!isShortTravelInvite(value)) return;
  const client = await requireAuthenticatedInviteClient();
  const { error } = await client.rpc('accept_travel_invite', {
    invite_code: value.slice(SHORT_INVITE_PREFIX.length),
  });
  if (error) throw new TravelInviteError('The invitation could not be accepted.');
}

export async function loadTravelInviteStatuses(
  codes: string[],
): Promise<Record<string, string>> {
  if (codes.length === 0 || !getSupabaseClient()) return {};
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('travel_invite_statuses', {
    invite_codes: codes,
  });
  if (error) throw new TravelInviteError('Invite statuses could not be refreshed.');
  const statuses: Record<string, string> = {};
  if (!Array.isArray(data)) return statuses;
  for (const row of data) {
    if (
      row &&
      typeof row === 'object' &&
      typeof row.code === 'string' &&
      typeof row.accepted_at === 'string'
    ) {
      statuses[row.code] = row.accepted_at;
    }
  }
  return statuses;
}

function travelInviteShareContent(
  plan: TravelPlan,
  code: string,
  invitee: TravelInvitee,
) {
  const inviteUrl = createTravelInviteUrl(
    code,
    process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL,
  );
  const message = [
    `${invitee.name}, you’re invited to “${plan.title}” ✈️`,
    `${plan.destination} · ${formatDateLong(plan.startDate)} – ${formatDateLong(plan.endDate)}`,
    'Open the trip in onTrack',
  ].join('\n');
  return {
    inviteUrl,
    message:
      process.env.EXPO_OS === 'ios'
        ? message
        : [message, inviteUrl].join('\n\n'),
  };
}

async function openTravelInviteShareSheet(
  plan: TravelPlan,
  code: string,
  invitee: TravelInvitee,
): Promise<boolean> {
  const { inviteUrl, message } = travelInviteShareContent(plan, code, invitee);
  const result = await Share.share(
    {
      title: `${plan.title} · onTrack`,
      message,
      ...(process.env.EXPO_OS === 'ios' ? { url: inviteUrl } : {}),
    },
    { subject: `You’re invited to ${plan.title}` },
  );
  return result.action !== Share.dismissedAction;
}

export async function shareTravelPlan(
  plan: TravelPlan,
  invitee: TravelInvitee,
): Promise<string | undefined> {
  const code = await publishTravelInvite(plan, invitee);
  const shared = await openTravelInviteShareSheet(plan, code, invitee);
  return shared ? code : undefined;
}

export async function resendTravelInvite(
  plan: TravelPlan,
  invitee: TravelInvitee,
  code: string,
): Promise<boolean> {
  return openTravelInviteShareSheet(plan, code, invitee);
}

export async function revokeTravelInvite(code: string): Promise<void> {
  const client = await requireAuthenticatedInviteClient();
  const { error } = await client.rpc('revoke_travel_invite', {
    invite_code: code,
  });
  if (error) throw new TravelInviteError('The invitation could not be removed.');
}
