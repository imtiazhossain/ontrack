import {
    ensureDevModeSandboxSync,
    enterDevMode,
    exitAgentDevModeIfNeeded,
    exitDevMode,
    settleDevModeAfterRehydrate,
} from '@/features/account/dev-mode-controller';
import {
    isCloudSyncPushPaused,
    setCloudSyncPushPaused,
} from '@/services/cloud/sync';
import { useDevMode } from '@/store/dev-mode';
import { useTravel } from '@/store/travel';
import {
    AGENT_UI_DEMO_TRIP_ID,
    seedAgentUiFixture,
} from '@/utils/agent-ui/fixtures';

jest.mock('@/services/cloud/sync', () => {
  const actual = jest.requireActual('@/services/cloud/sync') as typeof import('@/services/cloud/sync');
  return {
    ...actual,
    flushCloudSync: jest.fn(async () => undefined),
  };
});

describe('dev-mode-controller', () => {
  beforeEach(() => {
    useDevMode.setState({ enabled: false, source: null, liveSnapshot: null });
    setCloudSyncPushPaused(false);
    useTravel.getState().reset();
  });

  afterEach(() => {
    useDevMode.setState({ enabled: false, source: null, liveSnapshot: null });
    setCloudSyncPushPaused(false);
    useTravel.getState().reset();
  });

  it('pauses cloud push and restores travel plans after exit', async () => {
    useTravel.getState().replacePlans([
      {
        id: 'trip-live',
        title: 'Live Trip',
        mode: 'flight',
        origin: 'NYC',
        destination: 'Lisbon',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        itinerary: [],
      },
    ]);

    await enterDevMode();
    expect(useDevMode.getState().enabled).toBe(true);
    expect(useDevMode.getState().source).toBe('user');
    expect(isCloudSyncPushPaused()).toBe(true);
    expect(useDevMode.getState().liveSnapshot?.domains.travel).toBeTruthy();

    useTravel.getState().replacePlans([
      {
        id: AGENT_UI_DEMO_TRIP_ID,
        title: 'Demo Pollution',
        mode: 'flight',
        origin: 'A',
        destination: 'B',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        itinerary: [],
      },
    ]);
    expect(useTravel.getState().plans[0]?.id).toBe(AGENT_UI_DEMO_TRIP_ID);

    await exitDevMode();
    expect(useDevMode.getState().enabled).toBe(false);
    expect(useDevMode.getState().source).toBeNull();
    expect(isCloudSyncPushPaused()).toBe(false);
    expect(useTravel.getState().plans.map((plan) => plan.id)).toEqual(['trip-live']);
  });

  it('deep-clones the snapshot so sandbox seeds cannot mutate it', async () => {
    useTravel.getState().replacePlans([
      {
        id: 'trip-live',
        title: 'Live Trip',
        mode: 'flight',
        origin: 'NYC',
        destination: 'Lisbon',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        itinerary: [],
      },
    ]);

    await enterDevMode();
    const snapPlans = useDevMode.getState().liveSnapshot?.domains.travel?.plans as
      | { id: string }[]
      | undefined;
    expect(Array.isArray(snapPlans)).toBe(true);
    expect(snapPlans).not.toBe(useTravel.getState().plans);

    seedAgentUiFixture('travel-demo');
    expect(useTravel.getState().plans.some((plan) => plan.id === AGENT_UI_DEMO_TRIP_ID)).toBe(
      true,
    );
    expect(
      (useDevMode.getState().liveSnapshot?.domains.travel?.plans as { id: string }[]).map(
        (plan) => plan.id,
      ),
    ).toEqual(['trip-live']);

    await exitDevMode();
    expect(useTravel.getState().plans.map((plan) => plan.id)).toEqual(['trip-live']);
    expect(useTravel.getState().plans.some((plan) => plan.id === AGENT_UI_DEMO_TRIP_ID)).toBe(
      false,
    );
  });

  it('purges reserved agent-ui demo trips even when the snapshot was polluted', async () => {
    useTravel.getState().replacePlans([
      {
        id: AGENT_UI_DEMO_TRIP_ID,
        title: 'Stuck Demo',
        mode: 'flight',
        origin: 'A',
        destination: 'B',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        itinerary: [],
      },
    ]);
    await enterDevMode();
    await exitDevMode();
    expect(useTravel.getState().plans.some((plan) => plan.id === AGENT_UI_DEMO_TRIP_ID)).toBe(
      false,
    );
  });

  it('keeps real trips created while Dev Mode is on', async () => {
    useTravel.getState().replacePlans([]);
    await enterDevMode();

    useTravel.getState().replacePlans([
      {
        id: 'trip-invite-real-iceland',
        title: 'Iceland',
        mode: 'flight',
        origin: 'EWR',
        destination: 'Reykjavík, Iceland',
        startDate: '2026-09-08',
        endDate: '2026-09-14',
        itinerary: [],
      },
      {
        id: AGENT_UI_DEMO_TRIP_ID,
        title: 'Demo',
        mode: 'flight',
        origin: 'A',
        destination: 'B',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        itinerary: [],
      },
    ]);

    await exitDevMode();
    const ids = useTravel.getState().plans.map((plan) => plan.id);
    expect(ids).toContain('trip-invite-real-iceland');
    expect(ids).not.toContain(AGENT_UI_DEMO_TRIP_ID);
  });

  it('keeps sandbox edits to an existing live trip', async () => {
    useTravel.getState().replacePlans([
      {
        id: 'trip-live',
        title: 'Live Trip',
        mode: 'flight',
        origin: 'NYC',
        destination: 'Lisbon',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        itinerary: [],
      },
    ]);
    await enterDevMode();
    useTravel.getState().savePlan({
      id: 'trip-live',
      title: 'Live Trip Edited',
      mode: 'flight',
      origin: 'NYC',
      destination: 'Lisbon',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      itinerary: [],
    });
    await exitDevMode();
    expect(useTravel.getState().plans.find((plan) => plan.id === 'trip-live')?.title).toBe(
      'Live Trip Edited',
    );
  });

  it('keeps trips deleted in the sandbox deleted after exit', async () => {
    useTravel.getState().replacePlans([
      {
        id: 'trip-keep',
        title: 'Keep Me',
        mode: 'flight',
        origin: 'NYC',
        destination: 'Lisbon',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        itinerary: [],
      },
      {
        id: 'trip-delete',
        title: 'Delete Me',
        mode: 'flight',
        origin: 'BOS',
        destination: 'Test',
        startDate: '2026-09-27',
        endDate: '2026-09-30',
        itinerary: [],
      },
    ]);
    await enterDevMode();
    useTravel.getState().removePlan('trip-delete');
    expect(useTravel.getState().plans.map((plan) => plan.id)).toEqual(['trip-keep']);

    const snapPlans = useDevMode.getState().liveSnapshot?.domains.travel?.plans as
      | { id: string }[]
      | undefined;
    expect(snapPlans?.map((plan) => plan.id)).toEqual(['trip-keep']);

    await exitDevMode();
    expect(useTravel.getState().plans.map((plan) => plan.id)).toEqual(['trip-keep']);
  });

  it('keeps sandbox deletions after agent cold-start settle', async () => {
    useTravel.getState().replacePlans([
      {
        id: 'trip-live',
        title: 'Live Trip',
        mode: 'flight',
        origin: 'NYC',
        destination: 'Lisbon',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        itinerary: [],
      },
    ]);
    ensureDevModeSandboxSync();
    useTravel.getState().removePlan('trip-live');
    await settleDevModeAfterRehydrate();
    expect(useTravel.getState().plans.map((plan) => plan.id)).toEqual([]);
  });

  it('ensureDevModeSandboxSync is idempotent and marks source=agent', () => {
    ensureDevModeSandboxSync();
    const first = useDevMode.getState().liveSnapshot?.capturedAt;
    expect(useDevMode.getState().source).toBe('agent');
    ensureDevModeSandboxSync();
    expect(useDevMode.getState().enabled).toBe(true);
    expect(useDevMode.getState().source).toBe('agent');
    expect(useDevMode.getState().liveSnapshot?.capturedAt).toBe(first);
    expect(isCloudSyncPushPaused()).toBe(true);
  });

  it('does not downgrade a user sandbox to agent', async () => {
    await enterDevMode('user');
    ensureDevModeSandboxSync();
    expect(useDevMode.getState().source).toBe('user');
  });

  it('exitAgentDevModeIfNeeded releases agent sandboxes only', async () => {
    ensureDevModeSandboxSync();
    expect(await exitAgentDevModeIfNeeded()).toBe(true);
    expect(useDevMode.getState().enabled).toBe(false);

    await enterDevMode('user');
    expect(await exitAgentDevModeIfNeeded()).toBe(false);
    expect(useDevMode.getState().enabled).toBe(true);
    expect(useDevMode.getState().source).toBe('user');
  });

  it('settleDevModeAfterRehydrate exits agent leftovers and keeps user sandboxes', async () => {
    ensureDevModeSandboxSync();
    await settleDevModeAfterRehydrate();
    expect(useDevMode.getState().enabled).toBe(false);
    expect(isCloudSyncPushPaused()).toBe(false);

    await enterDevMode('user');
    await settleDevModeAfterRehydrate();
    expect(useDevMode.getState().enabled).toBe(true);
    expect(useDevMode.getState().source).toBe('user');
    expect(isCloudSyncPushPaused()).toBe(true);
  });

  it('settleDevModeAfterRehydrate exits pre-migration enabled state without source', async () => {
    useDevMode.setState({
      enabled: true,
      source: null,
      liveSnapshot: {
        capturedAt: new Date().toISOString(),
        domains: {},
      },
    });
    setCloudSyncPushPaused(true);
    await settleDevModeAfterRehydrate();
    expect(useDevMode.getState().enabled).toBe(false);
    expect(isCloudSyncPushPaused()).toBe(false);
  });
});
