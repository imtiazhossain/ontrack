import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { getNotificationsModule } from '@/services/notifications/runtime';
import { getSupabaseClient } from '@/services/cloud/supabase';
import type { TravelPlan } from '@/features/travel/types';
import {
  addDays,
  formatDateLong,
  formatWeekday,
  fromDateKey,
  toDateKey,
  todayKey,
} from '@/utils/date';

export const EVENT_CHAT_NOTIFICATION_CHANNEL = 'event-chat';
const CHAT_DEVICE_ID_KEY = 'ontrack.travel-chat-device-id';

export interface TravelChatMessage {
  id: string;
  senderName: string;
  senderDeviceId: string;
  /** Signed-in account that sent the message; missing on older rows. */
  senderUserId?: string;
  body: string;
  createdAt: string;
}

/** Prefer account identity so the same user looks like "me" across devices. */
export function isTravelChatMessageMine(
  message: Pick<TravelChatMessage, 'senderDeviceId' | 'senderUserId'>,
  identity: { userId?: string | null; deviceId?: string | null },
): boolean {
  const userId = identity.userId?.trim();
  if (userId && message.senderUserId) {
    return message.senderUserId === userId;
  }
  const deviceId = identity.deviceId?.trim();
  return Boolean(deviceId && message.senderDeviceId === deviceId);
}

export type TravelChatListItem =
  | { type: 'date'; id: string; dateKey: string; label: string }
  | { type: 'message'; id: string; message: TravelChatMessage };

/** Day chrome for chat: Today / Yesterday / weekday + date (+ year when needed). */
export function travelChatDayLabel(dateKey: string, now = new Date()): string {
  const today = toDateKey(now);
  if (dateKey === today) return 'Today';
  if (dateKey === addDays(today, -1)) return 'Yesterday';
  const day = fromDateKey(dateKey);
  const base = `${formatWeekday(dateKey)}, ${formatDateLong(dateKey)}`;
  return day.getFullYear() === now.getFullYear()
    ? base
    : `${base}, ${day.getFullYear()}`;
}

/** Insert a date header before the first message of each local calendar day. */
export function buildTravelChatListItems(
  messages: TravelChatMessage[],
  now = new Date(),
): TravelChatListItem[] {
  const items: TravelChatListItem[] = [];
  let lastDateKey: string | undefined;
  for (const message of messages) {
    const dateKey = toDateKey(new Date(message.createdAt));
    if (dateKey !== lastDateKey) {
      items.push({
        type: 'date',
        id: `date-${dateKey}`,
        dateKey,
        label: travelChatDayLabel(dateKey, now),
      });
      lastDateKey = dateKey;
    }
    items.push({ type: 'message', id: message.id, message });
  }
  return items;
}

export class TravelChatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TravelChatError';
  }
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new TravelChatError('Trip chat is not configured for this build.');
  }
  return client;
}

export function travelChatAccessCode(plan: TravelPlan): string | undefined {
  if (plan.chatAccessCode) return plan.chatAccessCode;
  // Prefer the most recently accepted invite. Older invitees may have left
  // (revoked server-side) while still lingering first in the local array.
  const accepted = plan.participants
    .filter((participant) => participant.acceptedAt && participant.inviteCode)
    .sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''));
  return accepted[0]?.inviteCode;
}

function randomDeviceId(): string {
  // Cryptographically random so the device id (also the chat rate-limit key)
  // cannot be predicted or ground down by an attacker.
  return Crypto.randomUUID();
}

async function readStoredChatDeviceId(): Promise<string | null> {
  if (process.env.EXPO_OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(CHAT_DEVICE_ID_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(CHAT_DEVICE_ID_KEY);
}

async function writeStoredChatDeviceId(value: string): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    try {
      globalThis.localStorage?.setItem(CHAT_DEVICE_ID_KEY, value);
    } catch {
      // Private mode / blocked storage — still return an in-memory id below.
    }
    return;
  }
  await SecureStore.setItemAsync(CHAT_DEVICE_ID_KEY, value);
}

export async function getTravelChatDeviceId(): Promise<string> {
  const existing = await readStoredChatDeviceId();
  if (existing) return existing;
  const created = randomDeviceId();
  await writeStoredChatDeviceId(created);
  return created;
}

function mapMessage(value: unknown): TravelChatMessage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.sender_name !== 'string' ||
    typeof row.sender_device_id !== 'string' ||
    typeof row.body !== 'string' ||
    typeof row.created_at !== 'string'
  ) {
    return undefined;
  }
  const senderUserId =
    typeof row.sender_user_id === 'string' && row.sender_user_id
      ? row.sender_user_id
      : undefined;
  return {
    id: row.id,
    senderName: row.sender_name,
    senderDeviceId: row.sender_device_id,
    senderUserId,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function loadTravelChatMessages(
  accessCode: string,
): Promise<TravelChatMessage[]> {
  const { data, error } = await requireClient().rpc('travel_chat_messages', {
    chat_access_code: accessCode,
  });
  if (error) throw new TravelChatError('Messages could not be loaded.');
  return Array.isArray(data)
    ? data.flatMap((value) => {
        const message = mapMessage(value);
        return message ? [message] : [];
      })
    : [];
}

export async function sendTravelChatMessage(input: {
  accessCode: string;
  senderName: string;
  senderDeviceId: string;
  body: string;
}): Promise<TravelChatMessage> {
  const body = input.body.trim();
  if (!body) throw new TravelChatError('Write a message first.');
  if (body.length > 2000) {
    throw new TravelChatError('Messages can be up to 2,000 characters.');
  }
  const { data, error } = await requireClient().rpc('send_travel_chat_message', {
    chat_access_code: input.accessCode,
    chat_sender_device_id: input.senderDeviceId,
    chat_sender_name: input.senderName.trim() || 'Trip member',
    chat_body: body,
  });
  const message = mapMessage(data);
  if (error || !message) {
    throw new TravelChatError(error?.message ?? 'Your message could not be sent.');
  }
  return message;
}

export async function chatNotificationsAreEnabled(): Promise<boolean> {
  const notifications = await getNotificationsModule();
  if (!notifications) return false;
  return (await notifications.getPermissionsAsync()).granted;
}

export async function enableTravelChatNotifications(
  accessCode: string,
  deviceId: string,
): Promise<void> {
  if (process.env.EXPO_OS === 'web') {
    throw new TravelChatError('Push notifications are available in the mobile app.');
  }
  const notifications = await getNotificationsModule();
  if (!notifications) {
    throw new TravelChatError(
      'Push alerts require a development or production app build. Chat messages still work normally.',
    );
  }
  if (process.env.EXPO_OS === 'android') {
    await notifications.setNotificationChannelAsync(EVENT_CHAT_NOTIFICATION_CHANNEL, {
      name: 'Trip Chat',
      description: 'New messages from members of your trips',
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180],
    });
  }
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    throw new TravelChatError('Notifications are off. Enable them in system settings to continue.');
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (typeof projectId !== 'string') {
    throw new TravelChatError('The Expo project ID is missing from this build.');
  }
  let token: string;
  try {
    token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    throw new TravelChatError(
      'Push alerts are unavailable in this app build. Chat messages still work normally.',
    );
  }
  const { error } = await requireClient().rpc('register_travel_chat_device', {
    chat_access_code: accessCode,
    chat_device_id: deviceId,
    chat_expo_push_token: token,
  });
  if (error) throw new TravelChatError('This device could not be registered for chat alerts.');
}
