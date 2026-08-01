import { Share } from 'react-native';

import { getSupabaseClient } from '@/services/cloud/supabase';
import { formatDateLong } from '@/utils/date';

import { normalizeTravelItinerary } from './normalize';
import type {
    TravelFlightDetails,
    TravelItemKind,
    TravelItineraryItem,
    TravelOpenJoinPreview,
    TravelOpenJoinRequest,
    TravelOpenJoinStatus,
    TravelPlan,
    TravelRentalDetails,
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
  // Omit confirmation codes and seats from shareable invite payloads — those
  // are capability-bearing PII and must not live in base64url links.
  return [
    details.airline,
    details.flightNumber,
    details.departureAirport,
    details.arrivalAirport,
  ];
}

function compactRentalDetails(details?: TravelRentalDetails) {
  if (!details) return undefined;
  // Omit confirmation codes from invite payloads.
  return [
    details.company,
    details.pickupLocation,
    details.dropoffLocation,
    details.vehicleClass,
    details.dropoffDate,
    details.dropoffMinutes,
  ];
}

function compactItineraryItem(item: TravelItineraryItem) {
  const kind: Record<TravelItemKind, string> = {
    flight: 'f',
    stay: 's',
    activity: 'a',
    rental: 'r',
  };
  return [
    item.id,
    kind[item.kind],
    item.title,
    item.date,
    item.startMinutes,
    item.durationMinutes,
    item.details,
    // bookingUrl omitted from encoded invites (open redirect / tracking risk)
    undefined,
    compactFlightDetails(item.flight),
    compactRentalDetails(item.rental),
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
  const kind = {
    f: 'flight',
    s: 'stay',
    a: 'activity',
    r: 'rental',
  }[stringAt(value, 1) ?? ''];
  const flightRaw = Array.isArray(value[8]) ? value[8] : undefined;
  // New encodes omit confirmation/seat (4 fields). Legacy encodes had 6.
  const flight = flightRaw
    ? flightRaw.length >= 6
      ? {
          airline: stringAt(flightRaw, 0),
          flightNumber: stringAt(flightRaw, 1),
          confirmationCode: stringAt(flightRaw, 2),
          departureAirport: stringAt(flightRaw, 3),
          arrivalAirport: stringAt(flightRaw, 4),
          seat: stringAt(flightRaw, 5),
        }
      : {
          airline: stringAt(flightRaw, 0),
          flightNumber: stringAt(flightRaw, 1),
          departureAirport: stringAt(flightRaw, 2),
          arrivalAirport: stringAt(flightRaw, 3),
        }
    : undefined;
  const rentalRaw = Array.isArray(value[9]) ? value[9] : undefined;
  const rental = rentalRaw
    ? {
        company: stringAt(rentalRaw, 0),
        pickupLocation: stringAt(rentalRaw, 1),
        dropoffLocation: stringAt(rentalRaw, 2),
        vehicleClass: stringAt(rentalRaw, 3),
        dropoffDate: stringAt(rentalRaw, 4),
        dropoffMinutes:
          typeof rentalRaw[5] === 'number' ? rentalRaw[5] : undefined,
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
    rental,
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
    baseCurrency: 'USD',
    expenses: [],
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
        baseCurrency: 'USD',
        expenses: [],
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

/** Local id for a short invite code so distinct trips never collapse on title/dates. */
export function travelInviteLocalId(inviteCode: string): string {
  return `trip-invite-${inviteCode}`;
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

export function isOpenTravelJoinCode(value: string): boolean {
  return /^[a-f0-9]{20}$/.test(value);
}

export function createTravelInviteUrl(code: string, configuredBase?: string): string {
  const path = `/i/${code}`;
  const normalizedBase = (configuredBase || ONTRACK_TRAVEL_SHARE_URL).replace(/\/$/, '');
  return `${normalizedBase}${path}`;
}

export function createTravelOpenJoinUrl(code: string, configuredBase?: string): string {
  const path = `/j/${code}`;
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

export function createInstalledTravelOpenJoinUrl(code: string): string {
  return `ontrack:///j/${code}`;
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

function asOpenJoinStatus(value: unknown): TravelOpenJoinStatus | undefined {
  return value === 'none' ||
    value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'host'
    ? value
    : undefined;
}

function parseOpenJoinStatusPayload(data: unknown): {
  status: TravelOpenJoinStatus;
  requestId?: string;
  tripId?: string;
  grantedInviteCode?: string;
} {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TravelInviteError('Join status could not be loaded.');
  }
  const row = data as Record<string, unknown>;
  const status = asOpenJoinStatus(row.status);
  if (!status) throw new TravelInviteError('Join status could not be loaded.');
  return {
    status,
    requestId: typeof row.requestId === 'string' ? row.requestId : undefined,
    tripId: typeof row.tripId === 'string' ? row.tripId : undefined,
    grantedInviteCode:
      typeof row.grantedInviteCode === 'string' &&
      /^[a-f0-9]{20}$/.test(row.grantedInviteCode)
        ? row.grantedInviteCode
        : undefined,
  };
}

export async function ensureTravelOpenJoinLink(plan: TravelPlan): Promise<string> {
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('create_travel_open_join_link', {
    invite_trip_id: plan.id,
    invite_title: plan.title,
    invite_destination: plan.destination,
    invite_start_date: plan.startDate,
    invite_end_date: plan.endDate,
    invite_payload: { invite: encodeTravelInvite(plan) },
  });
  if (error || typeof data !== 'string' || !isOpenTravelJoinCode(data)) {
    throw new TravelInviteError(
      error?.message ?? 'The open join link could not be created. Please try again.',
    );
  }
  return data;
}

export async function previewTravelOpenJoin(
  code: string,
): Promise<TravelOpenJoinPreview | undefined> {
  if (!isOpenTravelJoinCode(code)) return undefined;
  const client = getSupabaseClient();
  if (!client) return undefined;
  const { data, error } = await client.rpc('preview_travel_open_join', {
    link_code: code,
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }
  const row = data as Record<string, unknown>;
  if (
    typeof row.title !== 'string' ||
    typeof row.destination !== 'string' ||
    typeof row.startDate !== 'string' ||
    typeof row.endDate !== 'string' ||
    typeof row.tripId !== 'string'
  ) {
    return undefined;
  }
  return {
    title: row.title,
    destination: row.destination,
    startDate: row.startDate,
    endDate: row.endDate,
    tripId: row.tripId,
  };
}

export async function requestTravelOpenJoin(code: string): Promise<{
  status: TravelOpenJoinStatus;
  requestId?: string;
  tripId?: string;
  grantedInviteCode?: string;
}> {
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('request_travel_open_join', {
    link_code: code,
  });
  if (error) {
    throw new TravelInviteError(
      error.message || 'Your join request could not be sent. Please try again.',
    );
  }
  return parseOpenJoinStatusPayload(data);
}

export async function loadTravelOpenJoinStatus(code: string): Promise<{
  status: TravelOpenJoinStatus;
  requestId?: string;
  tripId?: string;
  grantedInviteCode?: string;
} | undefined> {
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('travel_open_join_status', {
    link_code: code,
  });
  if (error) {
    throw new TravelInviteError('Join status could not be refreshed.');
  }
  if (data == null) return undefined;
  return parseOpenJoinStatusPayload(data);
}

export async function listTravelOpenJoinRequests(
  tripId: string,
): Promise<TravelOpenJoinRequest[]> {
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('list_travel_open_join_requests', {
    invite_trip_id: tripId,
  });
  if (error) {
    throw new TravelInviteError('Join requests could not be loaded.');
  }
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      typeof item.requester_name !== 'string' ||
      typeof item.requester_email !== 'string' ||
      typeof item.status !== 'string' ||
      typeof item.created_at !== 'string'
    ) {
      return [];
    }
    if (
      item.status !== 'pending' &&
      item.status !== 'approved' &&
      item.status !== 'rejected'
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        requesterName: item.requester_name,
        requesterEmail: item.requester_email,
        status: item.status,
        createdAt: item.created_at,
        grantedInviteCode:
          typeof item.granted_invite_code === 'string' &&
          /^[a-f0-9]{20}$/.test(item.granted_invite_code)
            ? item.granted_invite_code
            : undefined,
      },
    ];
  });
}

export async function decideTravelOpenJoin(
  requestId: string,
  approve: boolean,
): Promise<{
  status: TravelOpenJoinStatus;
  requestId: string;
  grantedInviteCode?: string;
  requesterName?: string;
  requesterEmail?: string;
}> {
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('decide_travel_open_join', {
    request_id: requestId,
    approve,
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TravelInviteError(
      error?.message ?? 'The join request could not be updated.',
    );
  }
  const row = data as Record<string, unknown>;
  const status = asOpenJoinStatus(row.status);
  if (!status || typeof row.requestId !== 'string') {
    throw new TravelInviteError('The join request could not be updated.');
  }
  return {
    status,
    requestId: row.requestId,
    grantedInviteCode:
      typeof row.grantedInviteCode === 'string' &&
      /^[a-f0-9]{20}$/.test(row.grantedInviteCode)
        ? row.grantedInviteCode
        : undefined,
    requesterName:
      typeof row.requesterName === 'string' ? row.requesterName : undefined,
    requesterEmail:
      typeof row.requesterEmail === 'string' ? row.requesterEmail : undefined,
  };
}

export async function resolveTravelOpenJoin(code: string): Promise<{
  plan: Omit<TravelPlan, 'id' | 'createdAt' | 'updatedAt'>;
  tripId: string;
  grantedInviteCode?: string;
  status: TravelOpenJoinStatus;
}> {
  const client = await requireAuthenticatedInviteClient();
  const { data, error } = await client.rpc('resolve_travel_open_join', {
    link_code: code,
  });
  if (error) {
    throw new TravelInviteError(
      error.message || 'This trip could not be opened yet.',
    );
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TravelInviteError('This join link is invalid or has expired.');
  }
  const row = data as Record<string, unknown>;
  const invite =
    typeof row.invite === 'string' ? decodeTravelInvite(row.invite) : undefined;
  const tripId = typeof row.tripId === 'string' ? row.tripId : undefined;
  const status = asOpenJoinStatus(row.status);
  if (!invite || !tripId || !status) {
    throw new TravelInviteError('This join link is invalid or has expired.');
  }
  return {
    plan: invite,
    tripId,
    status,
    grantedInviteCode:
      typeof row.grantedInviteCode === 'string' &&
      /^[a-f0-9]{20}$/.test(row.grantedInviteCode)
        ? row.grantedInviteCode
        : undefined,
  };
}

export async function shareTravelOpenJoinLink(
  plan: TravelPlan,
  code: string,
): Promise<boolean> {
  const inviteUrl = createTravelOpenJoinUrl(
    code,
    process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL,
  );
  const message = [
    `Join “${plan.title}” on onTrack ✈️`,
    `${plan.destination} · ${formatDateLong(plan.startDate)} – ${formatDateLong(plan.endDate)}`,
    'Open the link to request to join. The trip host will approve new friends.',
  ].join('\n');
  const result = await Share.share(
    {
      title: `${plan.title} · Join onTrack`,
      message:
        process.env.EXPO_OS === 'ios'
          ? message
          : [message, inviteUrl].join('\n\n'),
      ...(process.env.EXPO_OS === 'ios' ? { url: inviteUrl } : {}),
    },
    { subject: `Join ${plan.title} on onTrack` },
  );
  return result.action !== Share.dismissedAction;
}
