import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { normalizeTravelItinerary } from './normalize';
import type { TravelPlan } from './types';

export const ONTRACK_APP_STORE_URL = 'https://apps.apple.com/app/id6789723522';

export function encodeTravelInvite(plan: TravelPlan): string {
  return encodeURIComponent(
    JSON.stringify({
      version: 1,
      plan: {
        ...plan,
        // Imported plans receive a new local identifier to avoid overwriting.
        id: undefined,
      },
    }),
  );
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

export async function shareTravelPlan(plan: TravelPlan): Promise<void> {
  const payload = encodeTravelInvite(plan);
  const installedAppUrl = Linking.createURL('/invite/travel', { queryParams: { invite: payload } });
  const configuredBase = process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL?.replace(/\/$/, '');
  const inviteUrl = configuredBase
    ? `${configuredBase}/invite/travel?invite=${payload}`
    : installedAppUrl;

  await Share.share({
    title: `${plan.title} · onTrack`,
    message: [
      `Pack your bags ✈️ I invited you to “${plan.title}” in onTrack.`,
      inviteUrl,
      configuredBase ? '' : `Need the app first? ${ONTRACK_APP_STORE_URL}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    url: inviteUrl,
  });
}
