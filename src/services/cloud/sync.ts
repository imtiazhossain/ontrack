import { Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { DEFAULT_ADDON_STATE } from '@/addons/registry';
import type { AddonEnabledState } from '@/addons/types';
import type { AgentConversations, AgentInstallations } from '@/agents/types';
import { ALL_ACCOUNTS_TEST_TRIP } from '@/constants/travel';
import { deleteAllVisionBoardImages } from '@/features/vision-board/media';
import {
    hasCustomizedVisionBoardCategories,
    hasCustomizedVisionBoardItems,
} from '@/features/vision-board/selectors';
import { ensurePlantSample } from '@/features/plants/sample';
import type {
    VisionBoardCategory,
    VisionBoardItem,
} from '@/features/vision-board/types';
import { deletePlant } from '@/services/plants/schedule';
import { loadAllSharedTodoLists } from '@/services/todos/collaboration';
import { pullAllTravelTripExpenses } from '@/services/travel/expense-collaboration';
import { loadAllSharedVehicles } from '@/services/vehicles/collaboration';
import { useAddons } from '@/store/addons';
import { useAgents } from '@/store/agents';
import { useFriends } from '@/store/friends';
import { useNutrition } from '@/store/nutrition';
import { usePlants } from '@/store/plants';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { privateTodoPayload, useTodos } from '@/store/todos';
import { useTravel } from '@/store/travel';
import { useUI } from '@/store/ui';
import { privateVehiclePayload, useVehicles } from '@/store/vehicles';
import { useVisionBoard } from '@/store/vision-board';
import type { Plant } from '@/types/models';

import { decideAccountData } from './data-ownership';
import { loadEntitlements } from './entitlements';
import { prepareCloudMedia, resolveCloudMedia } from './media';
import { getSupabaseClient } from './supabase';

export type SyncDomainName =
  | 'addons'
  | 'agents'
  | 'preferences'
  | 'schedule'
  | 'plants'
  | 'travel'
  | 'todos'
  | 'vision-board'
  | 'vehicles';
export type InitialSyncResult = 'ready' | 'conflict';
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
  reset: () => void;
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
    reset: () => useAddons.getState().reset(),
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
    reset: () => useAgents.getState().reset(),
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
    reset: () => usePreferences.getState().resetAll(),
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
    reset: () => useSchedule.getState().resetAll(),
    subscribe: (onChange) => useSchedule.subscribe(onChange),
  },
  {
    name: 'plants',
    read: () => {
      const state = usePlants.getState();
      return {
        plants: state.plants,
        sampleVersion: state.sampleVersion,
        sampleDismissed: state.sampleDismissed,
      };
    },
    write: (payload) => {
      if (!Array.isArray(payload.plants)) return;
      const upgraded = ensurePlantSample(
        payload.plants as Plant[],
        typeof payload.sampleVersion === 'number'
          ? payload.sampleVersion
          : usePlants.getState().sampleVersion,
        typeof payload.sampleDismissed === 'boolean'
          ? payload.sampleDismissed
          : usePlants.getState().sampleDismissed,
      );
      usePlants.setState({
        plants: upgraded.plants,
        sampleVersion: upgraded.sampleVersion,
        sampleDismissed: upgraded.sampleDismissed,
      });
    },
    reset: () => usePlants.getState().reset(),
    subscribe: (onChange) => usePlants.subscribe(onChange),
  },
  {
    name: 'travel',
    read: () => ({ plans: useTravel.getState().plans }),
    write: (payload) => {
      if (Array.isArray(payload.plans)) useTravel.getState().replacePlans(payload.plans);
    },
    reset: () => useTravel.getState().reset(),
    subscribe: (onChange) => useTravel.subscribe(onChange),
  },
  {
    name: 'todos',
    read: () => privateTodoPayload(useTodos.getState()),
    write: (payload) => {
      useTodos.getState().replacePrivateData(payload);
    },
    reset: () => useTodos.getState().reset(),
    subscribe: (onChange) => useTodos.subscribe(onChange),
  },
  {
    name: 'vision-board',
    read: () => {
      const state = useVisionBoard.getState();
      return {
        categories: state.categories,
        items: state.items,
        sampleVersion: state.sampleVersion,
        updatedAt: state.updatedAt,
      };
    },
    write: (payload) => {
      if (!Array.isArray(payload.categories) || !Array.isArray(payload.items)) return;
      useVisionBoard.getState().replaceVisionBoardData(
        payload.categories as VisionBoardCategory[],
        payload.items as VisionBoardItem[],
        typeof payload.updatedAt === 'string' ? payload.updatedAt : undefined,
        typeof payload.sampleVersion === 'number' ? payload.sampleVersion : undefined,
      );
    },
    reset: () => useVisionBoard.getState().reset(),
    subscribe: (onChange) => useVisionBoard.subscribe(onChange),
  },
  {
    name: 'vehicles',
    read: () => ({
      vehicles: privateVehiclePayload(useVehicles.getState().vehicles),
    }),
    write: (payload) => {
      if (!Array.isArray(payload.vehicles)) return;
      const shared = useVehicles.getState().vehicles.filter((item) => item.mode === 'shared');
      useVehicles.getState().replaceVehicles([
        ...shared,
        ...payload.vehicles,
      ]);
    },
    reset: () => useVehicles.getState().reset(),
    subscribe: (onChange) => useVehicles.subscribe(onChange),
  },
];

let stopSubscriptions: (() => void) | undefined;
let activeUserId: string | undefined;
let activeEmail: string | undefined;
let pendingRemote: Map<SyncDomainName, JsonObject> | undefined;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Sync failed.';
}

const CLOUD_WRITE_BATCH_SIZE = 100;

async function pushDomains(
  userId: string,
  selectedDomains: (typeof domains)[number][],
) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud sync is not configured for this build.');
  const rows = await Promise.all(
    selectedDomains.map(async (domain) => ({
      user_id: userId,
      domain: domain.name,
      payload: await prepareCloudMedia(userId, domain.name, domain.read()),
    })),
  );
  for (let start = 0; start < rows.length; start += CLOUD_WRITE_BATCH_SIZE) {
    const { error } = await client.from('app_state').upsert(
      rows.slice(start, start + CLOUD_WRITE_BATCH_SIZE),
      { onConflict: 'user_id,domain' },
    );
    if (error) throw error;
  }
}

async function pushDomain(userId: string, domain: (typeof domains)[number]) {
  await pushDomains(userId, [domain]);
}

/** Serialize per-domain uploads so a slower older snapshot cannot overwrite a newer one. */
const domainPushChains = new Map<SyncDomainName, Promise<void>>();

function enqueueDomainPush(userId: string, domain: (typeof domains)[number]) {
  const previous = domainPushChains.get(domain.name) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => {
      if (activeUserId !== userId) return;
      return pushDomain(userId, domain);
    });
  domainPushChains.set(domain.name, next);
  const cleanup = () => {
    if (domainPushChains.get(domain.name) === next) {
      domainPushChains.delete(domain.name);
    }
  };
  void next.then(cleanup, cleanup);
  return next;
}

const SYNC_DEBOUNCE_MS = 1200;
/** Hold pushes while the user is mid-interaction so sync JS doesn't fight gestures. */
const SYNC_INTERACTION_COOLDOWN_MS = 1800;

function startSubscriptions(userId: string, email?: string) {
  stopSubscriptions?.();
  const timers = new Map<SyncDomainName, ReturnType<typeof setTimeout>>();

  const armPush = (domain: (typeof domains)[number]) => {
    const current = timers.get(domain.name);
    if (current) clearTimeout(current);
    timers.set(
      domain.name,
      setTimeout(() => {
        timers.delete(domain.name);
        const lastInteraction = useUI.getState().lastPageInteractionAt;
        if (
          lastInteraction > 0 &&
          Date.now() - lastInteraction < SYNC_INTERACTION_COOLDOWN_MS
        ) {
          armPush(domain);
          return;
        }
        void enqueueDomainPush(userId, domain)
          .then(() => {
            if (activeUserId !== userId) return;
            useCloudSyncStatus.setState({
              state: 'synced',
              email,
              lastSyncedAt: new Date().toISOString(),
              message: undefined,
            });
          })
          .catch((error: unknown) => {
            if (activeUserId !== userId) return;
            useCloudSyncStatus.setState({
              state: 'error',
              email,
              message: errorMessage(error),
            });
          });
      }, SYNC_DEBOUNCE_MS),
    );
  };

  const unsubscribers = domains.map((domain) =>
    domain.subscribe(() => armPush(domain)),
  );
  stopSubscriptions = () => {
    timers.forEach(clearTimeout);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

async function deleteAppOwnedMedia(options?: {
  plants?: boolean;
  visionBoard?: boolean;
  mealImages?: boolean;
}) {
  const clearPlants = options?.plants ?? true;
  const clearVisionBoard = options?.visionBoard ?? true;
  const clearMealImages = options?.mealImages ?? clearPlants;
  const plants = clearPlants ? [...usePlants.getState().plants] : [];
  await Promise.all([
    ...plants.map((plant) => deletePlant(plant.id)),
    clearVisionBoard ? deleteAllVisionBoardImages() : Promise.resolve(),
  ]);
  if (Platform.OS === 'web') return;
  const directories = [
    ...(clearPlants ? ['plants'] : []),
    ...(clearMealImages ? ['meal-images'] : []),
  ];
  for (const name of directories) {
    const directory = new Directory(Paths.document, name);
    if (directory.exists) {
      try {
        await directory.delete();
      } catch {
        // Best-effort cleanup; store references are cleared below.
      }
    }
  }
}

async function resetLocalDomains() {
  stopSubscriptions?.();
  stopSubscriptions = undefined;
  await deleteAppOwnedMedia();
  domains.forEach((domain) => domain.reset());
  useNutrition.getState().reset();
}

async function applyRemote(remote: Map<SyncDomainName, JsonObject>) {
  const resolved = new Map<SyncDomainName, JsonObject>();
  await Promise.all(
    [...remote.entries()].map(async ([name, payload]) => {
      resolved.set(name, await resolveCloudMedia(payload));
    }),
  );
  stopSubscriptions?.();
  stopSubscriptions = undefined;

  // Only replace domains the account already stores. Newly added domains
  // (or domains that failed to upload) keep local device data and are returned
  // so the caller can upload them before subscriptions start.
  const replacing = domains.filter((domain) => resolved.has(domain.name));
  const retained = domains.filter((domain) => !resolved.has(domain.name));
  const replacingPlants = replacing.some((domain) => domain.name === 'plants');
  const replacingSchedule = replacing.some((domain) => domain.name === 'schedule');
  await deleteAppOwnedMedia({
    plants: replacingPlants,
    visionBoard: replacing.some((domain) => domain.name === 'vision-board'),
    mealImages: replacingPlants || replacingSchedule,
  });
  for (const domain of replacing) {
    domain.reset();
    domain.write(resolved.get(domain.name)!);
  }
  // Refresh any signed URLs still living in retained local domains (e.g. an
  // older vision-board row that never made it to this account).
  for (const domain of retained) {
    domain.write(await resolveCloudMedia(domain.read()));
  }
  if (replacingSchedule) {
    useNutrition.getState().reset();
  }
  return retained;
}

export function hasMeaningfulLocalData(): boolean {
  const preferences = usePreferences.getState();
  if (preferences.hasOnboarded || preferences.name.trim() || preferences.goal.trim()) return true;
  if (usePlants.getState().plants.length > 0) return true;
  const todoState = useTodos.getState();
  if (
    todoState.tasks.length > 0 ||
    todoState.lists.some((list) => list.name !== 'To Do')
  ) return true;
  if (Object.keys(useAgents.getState().installations).length > 0) return true;
  if (Object.keys(useAgents.getState().conversations).length > 0) return true;
  if (useTravel.getState().plans.some((plan) => plan.id !== ALL_ACCOUNTS_TEST_TRIP.id)) return true;
  if (useVehicles.getState().vehicles.length > 0) return true;
  const visionBoard = useVisionBoard.getState();
  if (
    hasCustomizedVisionBoardItems(visionBoard.items) ||
    hasCustomizedVisionBoardCategories(visionBoard.categories)
  ) return true;
  return Object.entries(useAddons.getState().enabled).some(
    ([id, enabled]) => enabled !== DEFAULT_ADDON_STATE[id as keyof AddonEnabledState],
  );
}

export async function prepareAccountSync(
  userId: string,
  email: string | undefined,
  localCanConflict: boolean,
): Promise<InitialSyncResult> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud sync is not configured for this build.');
  stopCloudSync();
  activeUserId = userId;
  activeEmail = email;
  useCloudSyncStatus.setState({ state: 'syncing', email, message: undefined });

  const { data, error } = await client
    .from('app_state')
    .select('domain,payload')
    .eq('user_id', userId);
  if (error) throw error;

  const remote = new Map<SyncDomainName, JsonObject>();
  for (const row of data ?? []) {
    const payload = objectValue(row.payload);
    if (payload && domains.some((domain) => domain.name === row.domain)) {
      remote.set(row.domain as SyncDomainName, payload);
    }
  }

  const decision = decideAccountData(remote.size, localCanConflict, localCanConflict);
  if (decision === 'upload-device') {
    try {
      await pushDomains(userId, domains);
    } catch (uploadError) {
      // The account had no rows before this first upload. Remove any partial
      // rows so retrying cannot turn a failed promotion into a false conflict.
      await client.from('app_state').delete().eq('user_id', userId);
      throw uploadError;
    }
  } else if (decision === 'resolve-conflict') {
    pendingRemote = remote;
    return 'conflict';
  } else {
    const retained = await applyRemote(remote);
    if (retained.length > 0) {
      await pushDomains(userId, retained);
    }
  }

  pendingRemote = undefined;
  await loadEntitlements(userId);
  startSubscriptions(userId, email);
  useCloudSyncStatus.setState({
    state: 'synced',
    email,
    lastSyncedAt: new Date().toISOString(),
    message: undefined,
  });
  return 'ready';
}

export async function resolveAccountSync(choice: 'cloud' | 'device') {
  if (!activeUserId || !pendingRemote) throw new Error('There is no data choice to resolve.');
  useCloudSyncStatus.setState({ state: 'syncing', email: activeEmail, message: undefined });
  if (choice === 'cloud') {
    const retained = await applyRemote(pendingRemote);
    if (retained.length > 0) {
      await pushDomains(activeUserId, retained);
    }
  } else {
    await pushDomains(activeUserId, domains);
  }
  pendingRemote = undefined;
  await loadEntitlements(activeUserId);
  startSubscriptions(activeUserId, activeEmail);
  useCloudSyncStatus.setState({
    state: 'synced',
    email: activeEmail,
    lastSyncedAt: new Date().toISOString(),
    message: undefined,
  });
}

export function cancelAccountSync() {
  pendingRemote = undefined;
  stopCloudSync();
  useCloudSyncStatus.setState({
    state: getSupabaseClient() ? 'signed-out' : 'disabled',
    email: undefined,
    message: undefined,
  });
}

export async function flushCloudSync() {
  if (!activeUserId) return;
  stopSubscriptions?.();
  stopSubscriptions = undefined;
  useCloudSyncStatus.setState({ state: 'syncing', email: activeEmail, message: undefined });
  try {
    await pushDomains(activeUserId, domains);
    useCloudSyncStatus.setState({
      state: 'synced',
      email: activeEmail,
      lastSyncedAt: new Date().toISOString(),
      message: undefined,
    });
  } catch (error) {
    useCloudSyncStatus.setState({
      state: 'error',
      email: activeEmail,
      message: errorMessage(error),
    });
    throw error;
  } finally {
    if (activeUserId) startSubscriptions(activeUserId, activeEmail);
  }
}

/**
 * Pull-to-refresh: flush local edits, pull cloud domains, reload shared
 * collaboration snapshots and the friends graph.
 */
export async function refreshAppData() {
  const client = getSupabaseClient();
  if (!client || !activeUserId) {
    await useFriends.getState().refresh().catch(() => undefined);
    return;
  }

  const userId = activeUserId;
  const email = activeEmail;
  useCloudSyncStatus.setState({ state: 'syncing', email, message: undefined });

  try {
    await flushCloudSync().catch(() => undefined);

    const { data, error } = await client
      .from('app_state')
      .select('domain,payload')
      .eq('user_id', userId);
    if (error) throw error;

    const remote = new Map<SyncDomainName, JsonObject>();
    for (const row of data ?? []) {
      const payload = objectValue(row.payload);
      if (payload && domains.some((domain) => domain.name === row.domain)) {
        remote.set(row.domain as SyncDomainName, payload);
      }
    }

    if (remote.size > 0) {
      const retained = await applyRemote(remote);
      if (retained.length > 0) {
        await pushDomains(userId, retained).catch(() => undefined);
      }
      if (activeUserId === userId) {
        startSubscriptions(userId, email);
      }
    }

    await loadEntitlements(userId).catch(() => undefined);
    await Promise.all([
      loadAllSharedTodoLists().catch(() => undefined),
      loadAllSharedVehicles().catch(() => undefined),
      pullAllTravelTripExpenses().catch(() => undefined),
      useFriends.getState().refresh().catch(() => undefined),
    ]);

    if (activeUserId === userId) {
      useCloudSyncStatus.setState({
        state: 'synced',
        email,
        lastSyncedAt: new Date().toISOString(),
        message: undefined,
      });
    }
  } catch (error) {
    if (activeUserId === userId) {
      useCloudSyncStatus.setState({
        state: 'error',
        email,
        message: errorMessage(error),
      });
    }
    throw error;
  }
}

export function stopCloudSync() {
  stopSubscriptions?.();
  stopSubscriptions = undefined;
  activeUserId = undefined;
  activeEmail = undefined;
}

export async function clearLocalAccountData() {
  pendingRemote = undefined;
  stopCloudSync();
  await resetLocalDomains();
  useCloudSyncStatus.setState({
    state: getSupabaseClient() ? 'signed-out' : 'disabled',
    email: undefined,
    lastSyncedAt: undefined,
    message: undefined,
  });
}

/** Backward-compatible cleanup for callers mounted by older navigation shells. */
export function startCloudSync(): () => void {
  return () => stopCloudSync();
}
