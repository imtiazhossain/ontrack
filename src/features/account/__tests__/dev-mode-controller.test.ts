import {
  enterDevMode,
  exitDevMode,
  ensureDevModeSandboxSync,
} from '@/features/account/dev-mode-controller';
import {
  isCloudSyncPushPaused,
  setCloudSyncPushPaused,
} from '@/services/cloud/sync';
import { useDevMode } from '@/store/dev-mode';
import { useTravel } from '@/store/travel';

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

  it('ensureDevModeSandboxSync is idempotent', () => {
    ensureDevModeSandboxSync();
    const first = useDevMode.getState().liveSnapshot?.capturedAt;
    ensureDevModeSandboxSync();
    expect(useDevMode.getState().enabled).toBe(true);
    expect(useDevMode.getState().liveSnapshot?.capturedAt).toBe(first);
    expect(isCloudSyncPushPaused()).toBe(true);
  });
});
