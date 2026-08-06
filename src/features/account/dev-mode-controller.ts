import {
    flushCloudSync,
    restoreSyncedDomains,
    setCloudSyncPushPaused,
    snapshotSyncedDomains,
} from '@/services/cloud/sync';
import { useDevMode, type DevModeLiveSnapshot } from '@/store/dev-mode';
import { useHealth } from '@/store/health';

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

function activateSandbox(snapshot: DevModeLiveSnapshot) {
  useDevMode.setState({ enabled: true, liveSnapshot: snapshot });
  setCloudSyncPushPaused(true);
}

function clearSandboxFlag() {
  useDevMode.setState({ enabled: false, liveSnapshot: null });
  setCloudSyncPushPaused(false);
}

/**
 * Enter Dev Mode: flush real account to cloud, snapshot local domains, pause pushes.
 * Demo seeds and local edits stay on-device until exit restores the snapshot.
 */
export async function enterDevMode(): Promise<void> {
  const state = useDevMode.getState();
  if (state.enabled && state.liveSnapshot) {
    setCloudSyncPushPaused(true);
    return;
  }

  await flushCloudSync().catch(() => undefined);
  activateSandbox(captureLiveSnapshot());
}

/** Leave Dev Mode: restore the pre-sandbox snapshot and resume cloud sync. */
export async function exitDevMode(): Promise<void> {
  const { liveSnapshot } = useDevMode.getState();
  if (liveSnapshot?.domains) {
    restoreSyncedDomains(liveSnapshot.domains);
    writeHealthSnapshot(liveSnapshot.health);
  }
  // Reserved agent-ui ids must never stick on a live account — even when the
  // snapshot was already polluted or missing after a prior failed sandbox.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { purgeAgentUiDemoFixtures } =
    require('@/utils/agent-ui/fixtures') as typeof import('@/utils/agent-ui/fixtures');
  purgeAgentUiDemoFixtures();
  clearSandboxFlag();
}

export async function setDevModeEnabled(enabled: boolean): Promise<void> {
  if (enabled) await enterDevMode();
  else await exitDevMode();
}

/**
 * Sync path for agent-ui seeds: snapshot + pause immediately (no flush await)
 * so fixtures cannot race into a cloud push.
 */
export function ensureDevModeSandboxSync(): void {
  const state = useDevMode.getState();
  if (state.enabled && state.liveSnapshot) {
    setCloudSyncPushPaused(true);
    return;
  }
  activateSandbox(captureLiveSnapshot());
}

/** Re-apply pause after persist rehydrate (cold start while still in Dev Mode). */
export function rehydrateDevModeSyncGate() {
  if (useDevMode.getState().enabled) {
    setCloudSyncPushPaused(true);
  }
}
