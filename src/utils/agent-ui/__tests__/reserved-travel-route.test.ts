import {
    ensureDevModeSandboxSync,
    exitDevMode,
} from '@/features/account/dev-mode-controller';
import { useDevMode } from '@/store/dev-mode';
import { useTravel } from '@/store/travel';
import {
    AGENT_UI_DEMO_TRIP_ID,
    fixtureNameForReservedTripId,
    leaveReservedAgentUiTravelRouteIfNeeded,
    recoverMissingReservedTravelPlan,
    seedAgentUiFixture,
} from '@/utils/agent-ui/fixtures';
import {
    setAgentUiNavigator,
    setAgentUiRoute,
    travelPlanIdFromRoute,
} from '@/utils/agent-ui/route';
import { TRAVEL_HOME_ICELAND_TRIP_ID } from '@/features/travel/fixtures/travel-home';

jest.mock('@/services/cloud/sync', () => {
  const actual = jest.requireActual('@/services/cloud/sync') as typeof import('@/services/cloud/sync');
  return {
    ...actual,
    flushCloudSync: jest.fn(async () => undefined),
  };
});

describe('reserved travel route recovery', () => {
  beforeEach(() => {
    useDevMode.setState({ enabled: false, source: null, liveSnapshot: null });
    useTravel.getState().reset();
    setAgentUiRoute(null);
    setAgentUiNavigator(null);
  });

  afterEach(() => {
    useDevMode.setState({ enabled: false, source: null, liveSnapshot: null });
    useTravel.getState().reset();
    setAgentUiRoute(null);
    setAgentUiNavigator(null);
  });

  it('parses trip ids from nested travel routes', () => {
    expect(travelPlanIdFromRoute('/travel/trip-agent-ui-demo')).toBe(
      AGENT_UI_DEMO_TRIP_ID,
    );
    expect(travelPlanIdFromRoute('/travel/trip-agent-ui-demo/hub')).toBe(
      AGENT_UI_DEMO_TRIP_ID,
    );
    expect(travelPlanIdFromRoute('/travel/trip-agent-ui-demo/chat?x=1')).toBe(
      AGENT_UI_DEMO_TRIP_ID,
    );
    expect(travelPlanIdFromRoute('/to-do')).toBeNull();
  });

  it('maps reserved ids to seed fixtures', () => {
    expect(fixtureNameForReservedTripId(AGENT_UI_DEMO_TRIP_ID)).toBe('travel-demo');
    expect(fixtureNameForReservedTripId(TRAVEL_HOME_ICELAND_TRIP_ID)).toBe(
      'travel-home',
    );
    expect(fixtureNameForReservedTripId('trip-real')).toBeNull();
  });

  it('leaves reserved routes after navigate is wired', () => {
    const navigated: string[] = [];
    setAgentUiNavigator((href) => {
      navigated.push(href);
    });
    setAgentUiRoute('/travel/trip-agent-ui-demo');
    expect(leaveReservedAgentUiTravelRouteIfNeeded()).toBe(true);
    expect(navigated).toEqual(['/travel']);
  });

  it('re-seeds a missing reserved trip while Dev Mode is on', () => {
    ensureDevModeSandboxSync();
    expect(recoverMissingReservedTravelPlan(AGENT_UI_DEMO_TRIP_ID)).toBe(true);
    expect(
      useTravel.getState().plans.some((plan) => plan.id === AGENT_UI_DEMO_TRIP_ID),
    ).toBe(true);
  });

  it('leaves a missing reserved trip when Dev Mode is off', () => {
    const navigated: string[] = [];
    setAgentUiNavigator((href) => {
      navigated.push(href);
    });
    expect(recoverMissingReservedTravelPlan(AGENT_UI_DEMO_TRIP_ID)).toBe(false);
    expect(navigated).toEqual(['/travel']);
  });

  it('exitDevMode bounces off the purged demo trip route', async () => {
    const navigated: string[] = [];
    setAgentUiNavigator((href) => {
      navigated.push(href);
    });
    setAgentUiRoute('/travel/trip-agent-ui-demo/hub');
    seedAgentUiFixture('travel-demo');
    expect(
      useTravel.getState().plans.some((plan) => plan.id === AGENT_UI_DEMO_TRIP_ID),
    ).toBe(true);

    await exitDevMode();
    expect(
      useTravel.getState().plans.some((plan) => plan.id === AGENT_UI_DEMO_TRIP_ID),
    ).toBe(false);
    expect(navigated).toContain('/travel');
  });
});
