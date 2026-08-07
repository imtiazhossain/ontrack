import type { TravelPlan } from '@/features/travel/types';
import {
    flushCloudSync,
    restoreSyncedDomains,
    setCloudSyncPushPaused,
    snapshotSyncedDomains,
} from '@/services/cloud/sync';
import {
    useDevMode,
    type DevModeLiveSnapshot,
    type DevModeSource,
} from '@/store/dev-mode';
import { useHealth } from '@/store/health';
import { useTravel } from '@/store/travel';

function deepCloneJson<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

function readHealthSnapshot(): Record<string, unknown> {
  const state = useHealth.getState();
  return deepCloneJson({
    version: state.version,
    accessReviewed: state.accessReviewed,
    stateOfMindSyncEnabled: state.stateOfMindSyncEnabled,
    aiDisclosureAccepted: state.aiDisclosureAccepted,
    dailySummaries: state.dailySummaries,
    workouts: state.workouts,
    lastRefreshAt: state.lastRefreshAt,
    emotions: state.emotions,
    factors: state.factors,
    moodEntries: state.moodEntries,
    playbooks: state.playbooks,
    playbookRuns: state.playbookRuns,
  });
}

function writeHealthSnapshot(payload: Record<string, unknown> | undefined) {
  if (!payload) return;
  useHealth.setState({
    version: 1,
    accessReviewed: typeof payload.accessReviewed === 'boolean' ? payload.accessReviewed : false,
    stateOfMindSyncEnabled:
      typeof payload.stateOfMindSyncEnabled === 'boolean'
        ? payload.stateOfMindSyncEnabled
        : false,
    aiDisclosureAccepted:
      typeof payload.aiDisclosureAccepted === 'boolean' ? payload.aiDisclosureAccepted : false,
    dailySummaries: Array.isArray(payload.dailySummaries) ? payload.dailySummaries : [],
    workouts: Array.isArray(payload.workouts) ? payload.workouts : [],
    lastRefreshAt:
      typeof payload.lastRefreshAt === 'string' ? payload.lastRefreshAt : undefined,
    emotions: Array.isArray(payload.emotions) ? payload.emotions : useHealth.getState().emotions,
    factors: Array.isArray(payload.factors) ? payload.factors : [],
    moodEntries: Array.isArray(payload.moodEntries) ? payload.moodEntries : [],
    playbooks: Array.isArray(payload.playbooks) ? payload.playbooks : [],
    playbookRuns: Array.isArray(payload.playbookRuns) ? payload.playbookRuns : [],
  });
}

function captureLiveSnapshot(): DevModeLiveSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    // Deep clone so sandbox seeds cannot mutate the snapshot via shared refs.
    domains: deepCloneJson(snapshotSyncedDomains()),
    health: readHealthSnapshot(),
  };
}

function resolveSandboxSource(requested: DevModeSource): DevModeSource {
  const state = useDevMode.getState();
  // Never downgrade a user-owned sandbox to agent (Developer Hub stays sticky).
  if (state.enabled && state.source === 'user') return 'user';
  return requested;
}

function activateSandbox(snapshot: DevModeLiveSnapshot, source: DevModeSource) {
  useDevMode.setState({
    enabled: true,
    source: resolveSandboxSource(source),
    liveSnapshot: snapshot,
  });
  setCloudSyncPushPaused(true);
}

function clearSandboxFlag() {
  useDevMode.setState({ enabled: false, source: null, liveSnapshot: null });
  setCloudSyncPushPaused(false);
}

/**
 * Keep real trips created/edited in the sandbox after restore.
 * Reserved agent-ui / travel-home fixture ids are ignored here (purged next).
 * Deletions are handled separately: `removePlan` drops the id from the live
 * snapshot so restore cannot resurrect a trip the user already deleted.
 */
export function mergeSandboxTravelPlansIntoLive(sandboxPlans: unknown): void {
  if (!Array.isArray(sandboxPlans)) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isReservedAgentUiTripId } =
    require('@/utils/agent-ui/fixtures') as typeof import('@/utils/agent-ui/fixtures');

  const byId = new Map(
    useTravel.getState().plans.map((plan) => [plan.id, plan] as const),
  );
  let changed = false;

  for (const entry of sandboxPlans) {
    if (!entry || typeof entry !== 'object') continue;
    const plan = entry as TravelPlan;
    if (typeof plan.id !== 'string' || !plan.id.trim()) continue;
    if (isReservedAgentUiTripId(plan.id)) continue;
    byId.set(plan.id, plan);
    changed = true;
  }

  if (!changed) return;
  useTravel.getState().replacePlans([...byId.values()]);
}

/**
 * Enter Dev Mode: flush real account to cloud, snapshot local domains, pause pushes.
 * Demo seeds stay on-device until exit restores the snapshot (then purges reserved ids).
 * Real trips created or edited while Dev Mode is on are kept on exit.
 */
export async function enterDevMode(source: DevModeSource = 'user'): Promise<void> {
  const state = useDevMode.getState();
  if (state.enabled && state.liveSnapshot) {
    useDevMode.setState({ source: resolveSandboxSource(source) });
    setCloudSyncPushPaused(true);
    return;
  }

  await flushCloudSync().catch(() => undefined);
  activateSandbox(captureLiveSnapshot(), source);
}

/** Leave Dev Mode: restore the pre-sandbox snapshot and resume cloud sync. */
export async function exitDevMode(): Promise<void> {
  const sandboxPlans = useTravel.getState().plans;
  const { liveSnapshot } = useDevMode.getState();
  if (liveSnapshot?.domains) {
    restoreSyncedDomains(liveSnapshot.domains);
    writeHealthSnapshot(liveSnapshot.health);
  }
  // Real work done in the sandbox must survive restore (empty/old snapshots
  // previously wiped trips like Iceland that were only present while Dev Mode
  // was on, and paused push meant they never reached the cloud either).
  mergeSandboxTravelPlansIntoLive(sandboxPlans);
  // Reserved agent-ui ids must never stick on a live account — even when the
  // snapshot was already polluted or missing after a prior failed sandbox.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    leaveReservedAgentUiTravelRouteIfNeeded,
    purgeAgentUiDemoFixtures,
  } = require('@/utils/agent-ui/fixtures') as typeof import('@/utils/agent-ui/fixtures');
  purgeAgentUiDemoFixtures();
  // Nav stack often still points at /travel/trip-agent-ui-demo after purge.
  leaveReservedAgentUiTravelRouteIfNeeded();
  clearSandboxFlag();
}

export async function setDevModeEnabled(enabled: boolean): Promise<void> {
  if (enabled) await enterDevMode('user');
  else await exitDevMode();
}

/**
 * Sync path for agent-ui seeds: snapshot + pause immediately (no flush await)
 * so fixtures cannot race into a cloud push.
 * Marks source=agent so cold start / verify-both can turn Dev Mode back off.
 */
export function ensureDevModeSandboxSync(): void {
  const state = useDevMode.getState();
  if (state.enabled && state.liveSnapshot) {
    useDevMode.setState({ source: resolveSandboxSource('agent') });
    setCloudSyncPushPaused(true);
    return;
  }
  activateSandbox(captureLiveSnapshot(), 'agent');
}

/**
 * After persist rehydrate: keep user sandboxes paused; agent leftovers exit so
 * Dev Mode stays off by default when agents forget to turn it off.
 */
export async function settleDevModeAfterRehydrate(): Promise<void> {
  const state = useDevMode.getState();
  if (!state.enabled) return;
  // Missing source = pre-migration leftover (almost always agent seed) → exit.
  if (state.source !== 'user') {
    await exitDevMode();
    return;
  }
  setCloudSyncPushPaused(true);
}

/** @deprecated Use settleDevModeAfterRehydrate — kept for call-site clarity. */
export function rehydrateDevModeSyncGate() {
  void settleDevModeAfterRehydrate();
}

/** Exit only when the sandbox was entered by agent-ui (seeds / verify). */
export async function exitAgentDevModeIfNeeded(): Promise<boolean> {
  const state = useDevMode.getState();
  if (!state.enabled) return false;
  if (state.source === 'user') return false;
  await exitDevMode();
  return true;
}
