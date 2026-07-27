import { create } from 'zustand';

import { DEFAULT_ADDON_STATE } from '@/addons/registry';
import type { AddonEnabledState } from '@/addons/types';
import type { AgentConversations, AgentInstallations } from '@/agents/types';
import { useAddons } from '@/store/addons';
import { useAgents } from '@/store/agents';
import { usePlants } from '@/store/plants';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';

import { getSupabaseClient } from './supabase';
import { prepareCloudMedia, resolveCloudMedia } from './media';
import { loadEntitlements } from './entitlements';

type SyncDomainName = 'addons' | 'agents' | 'preferences' | 'schedule' | 'plants' | 'travel';
type JsonObject = Record<string, unknown>;

interface CloudSyncStatus {
  state: 'disabled' | 'signed-out' | 'syncing' | 'synced' | 'error';
  email?: string;
  lastSyncedAt?: string;
  message?: string;
}

export const useCloudSyncStatus = create<CloudSyncStatus>(() => ({
  state: getSupabaseClient() ? 'signed-out' : 'disabled',
}));

function objectValue(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

const domains: {
  name: SyncDomainName;
  read: () => JsonObject;
  write: (payload: JsonObject) => void;
  subscribe: (onChange: () => void) => () => void;
}[] = [
  {
    name: 'addons',
    read: () => {
      const state = useAddons.getState();
      return { enabled: state.enabled, updatedAt: state.updatedAt };
    },
    write: (payload) => {
      const enabled = objectValue(payload.enabled);
      if (!enabled) return;
      useAddons.getState().replaceEnabled(
        { ...DEFAULT_ADDON_STATE, ...enabled } as AddonEnabledState,
        typeof payload.updatedAt === 'string' ? payload.updatedAt : undefined,
      );
    },
    subscribe: (onChange) => useAddons.subscribe(onChange),
  },
  {
    name: 'agents',
    read: () => {
      const state = useAgents.getState();
      return {
        installations: state.installations,
        conversations: state.conversations,
        updatedAt: state.updatedAt,
      };
    },
    write: (payload) => {
      const installations = objectValue(payload.installations);
      const conversations = objectValue(payload.conversations);
      if (!installations || !conversations) return;
      useAgents.getState().replaceAgentData(
        installations as AgentInstallations,
        conversations as AgentConversations,
        typeof payload.updatedAt === 'string' ? payload.updatedAt : undefined,
      );
    },
    subscribe: (onChange) => useAgents.subscribe(onChange),
  },
  {
    name: 'preferences',
    read: () => {
      const state = usePreferences.getState();
      return {
        hasOnboarded: state.hasOnboarded,
        name: state.name,
        goal: state.goal,
        themePreference: state.themePreference,
        aiEnabled: state.aiEnabled,
        hapticsEnabled: state.hapticsEnabled,
        dateLocale: state.dateLocale,
        dateDisplayFormat: state.dateDisplayFormat,
      };
    },
    write: (payload) => {
      usePreferences.setState({
        hasOnboarded: typeof payload.hasOnboarded === 'boolean' ? payload.hasOnboarded : false,
        name: typeof payload.name === 'string' ? payload.name : '',
        goal: typeof payload.goal === 'string' ? payload.goal : '',
        themePreference:
          payload.themePreference === 'light' || payload.themePreference === 'dark'
            ? payload.themePreference
            : 'system',
        aiEnabled: typeof payload.aiEnabled === 'boolean' ? payload.aiEnabled : true,
        hapticsEnabled: typeof payload.hapticsEnabled === 'boolean' ? payload.hapticsEnabled : true,
        dateLocale:
          typeof payload.dateLocale === 'string'
            ? payload.dateLocale
            : usePreferences.getState().dateLocale,
        dateDisplayFormat:
          payload.dateDisplayFormat === 'mdy' || payload.dateDisplayFormat === 'iso'
            ? payload.dateDisplayFormat
            : usePreferences.getState().dateDisplayFormat,
      });
    },
    subscribe: (onChange) => usePreferences.subscribe(onChange),
  },
  {
    name: 'schedule',
    read: () => {
      const state = useSchedule.getState();
      return {
        seeded: state.seeded,
        activities: state.activities,
        meals: state.meals,
        workouts: state.workouts,
        workSessions: state.workSessions,
        movies: state.movies,
        categories: state.categories,
      };
    },
    write: (payload) => {
      useSchedule.setState({
        seeded: typeof payload.seeded === 'boolean' ? payload.seeded : false,
        activities: Array.isArray(payload.activities) ? payload.activities : [],
        meals: Array.isArray(payload.meals) ? payload.meals : [],
        workouts: Array.isArray(payload.workouts) ? payload.workouts : [],
        workSessions: Array.isArray(payload.workSessions) ? payload.workSessions : [],
        movies: Array.isArray(payload.movies) ? payload.movies : [],
        categories: Array.isArray(payload.categories)
          ? payload.categories
          : useSchedule.getState().categories,
      });
    },
    subscribe: (onChange) => useSchedule.subscribe(onChange),
  },
  {
    name: 'plants',
    read: () => ({ plants: usePlants.getState().plants }),
    write: (payload) => {
      if (Array.isArray(payload.plants)) usePlants.setState({ plants: payload.plants });
    },
    subscribe: (onChange) => usePlants.subscribe(onChange),
  },
  {
    name: 'travel',
    read: () => ({ plans: useTravel.getState().plans }),
    write: (payload) => {
      if (Array.isArray(payload.plans)) useTravel.getState().replacePlans(payload.plans);
    },
    subscribe: (onChange) => useTravel.subscribe(onChange),
  },
];

let stopActiveSync: (() => void) | undefined;

async function pushDomain(userId: string, domain: (typeof domains)[number]) {
  const client = getSupabaseClient();
  if (!client) return;
  const payload = await prepareCloudMedia(userId, domain.name, domain.read());
  const { error } = await client.from('app_state').upsert(
    { user_id: userId, domain: domain.name, payload },
    { onConflict: 'user_id,domain' },
  );
  if (error) throw error;
  useCloudSyncStatus.setState({
    state: 'synced',
    lastSyncedAt: new Date().toISOString(),
    message: undefined,
  });
}

async function activateSync(userId: string, email?: string) {
  stopActiveSync?.();
  stopActiveSync = undefined;
  const client = getSupabaseClient();
  if (!client) return;
  useCloudSyncStatus.setState({ state: 'syncing', email, message: undefined });
  await loadEntitlements(userId);

  const { data, error } = await client
    .from('app_state')
    .select('domain,payload')
    .eq('user_id', userId);
  if (error) throw error;

  const remote = new Map(
    (data ?? []).map((row) => [row.domain as SyncDomainName, objectValue(row.payload)]),
  );
  const missing: (typeof domains)[number][] = [];
  for (const domain of domains) {
    const payload = remote.get(domain.name);
    if (payload) domain.write(await resolveCloudMedia(payload));
    else missing.push(domain);
  }
  await Promise.all(missing.map((domain) => pushDomain(userId, domain)));

  const timers = new Map<SyncDomainName, ReturnType<typeof setTimeout>>();
  const unsubscribers = domains.map((domain) =>
    domain.subscribe(() => {
      const current = timers.get(domain.name);
      if (current) clearTimeout(current);
      timers.set(
        domain.name,
        setTimeout(() => {
          void pushDomain(userId, domain).catch((syncError: unknown) => {
            useCloudSyncStatus.setState({
              state: 'error',
              message: syncError instanceof Error ? syncError.message : 'Sync failed.',
            });
          });
        }, 1200),
      );
    }),
  );

  stopActiveSync = () => {
    timers.forEach(clearTimeout);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
  useCloudSyncStatus.setState({
    state: 'synced',
    email,
    lastSyncedAt: new Date().toISOString(),
    message: undefined,
  });
}

export function startCloudSync(): () => void {
  const client = getSupabaseClient();
  if (!client) {
    useCloudSyncStatus.setState({ state: 'disabled' });
    return () => undefined;
  }

  let active = true;
  const startForSession = (userId?: string, email?: string) => {
    if (!active) return;
    if (!userId) {
      stopActiveSync?.();
      stopActiveSync = undefined;
      useCloudSyncStatus.setState({ state: 'signed-out', email: undefined });
      return;
    }
    void activateSync(userId, email).catch((error: unknown) => {
      if (!active) return;
      useCloudSyncStatus.setState({
        state: 'error',
        email,
        message: error instanceof Error ? error.message : 'Sync failed.',
      });
    });
  };

  void client.auth.getSession().then(({ data }) => {
    startForSession(data.session?.user.id, data.session?.user.email);
  });
  const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => startForSession(session?.user.id, session?.user.email), 0);
  });

  return () => {
    active = false;
    listener.subscription.unsubscribe();
    stopActiveSync?.();
    stopActiveSync = undefined;
  };
}
