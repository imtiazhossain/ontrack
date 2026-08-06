import {
    ensureDevModeSandboxSync,
    enterDevMode,
    exitDevMode,
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
    useDevMode.setState({ enabled: false, liveSnapshot: null });
    setCloudSyncPushPaused(false);
    useTravel.getState().reset();
  });

  afterEach(() => {
    useDevMode.setState({ enabled: false, liveSnapshot: null });
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
    expect(isCloudSyncPushPaused()).toBe(true);
    expect(useDevMode.getState().liveSnapshot?.domains.travel).toBeTruthy();

    useTravel.getState().replacePlans([
      {
        id: 'trip-demo',
        title: 'Demo Pollution',
        mode: 'flight',
        origin: 'A',
        destination: 'B',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        itinerary: [],
      },
    ]);
    expect(useTravel.getState().plans[0]?.id).toBe('trip-demo');

    await exitDevMode();
    expect(useDevMode.getState().enabled).toBe(false);
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

  it('ensureDevModeSandboxSync is idempotent', () => {
    ensureDevModeSandboxSync();
    const first = useDevMode.getState().liveSnapshot?.capturedAt;
    ensureDevModeSandboxSync();
    expect(useDevMode.getState().enabled).toBe(true);
    expect(useDevMode.getState().liveSnapshot?.capturedAt).toBe(first);
    expect(isCloudSyncPushPaused()).toBe(true);
  });
});
