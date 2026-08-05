import {
    AGENT_UI_DEMO_CHASE_OUTBOUND_ID,
    AGENT_UI_DEMO_CHASE_RETURN_ID,
    AGENT_UI_DEMO_FLIGHT_ID,
    AGENT_UI_DEMO_TRIP_ID,
    buildAgentUiDemoTrip,
    createIdFromAgentUiItemIds,
    normalizeFixtureName,
    seedAgentUiFixture,
} from '../fixtures';
import {
    AGENT_UI_WAIT_TIMEOUT_MS,
    listAgentUiFlowNames,
    resolveAgentUiFlow,
} from '../flows';

const mockSavePlan = jest.fn(() => true);
const mockRecordPlanInteraction = jest.fn();

jest.mock('@/store/travel', () => ({
  useTravel: {
    getState: () => ({
      savePlan: mockSavePlan,
      recordPlanInteraction: mockRecordPlanInteraction,
    }),
  },
}));

describe('agent-ui fixtures', () => {
  beforeEach(() => {
    mockSavePlan.mockClear();
    mockRecordPlanInteraction.mockClear();
    mockSavePlan.mockReturnValue(true);
  });

  it('builds a stable demo trip', () => {
    const plan = buildAgentUiDemoTrip('2026-01-02T00:00:00.000Z');
    expect(plan.id).toBe(AGENT_UI_DEMO_TRIP_ID);
    expect(plan.itinerary[0]?.id).toBe(AGENT_UI_DEMO_FLIGHT_ID);
    expect(normalizeFixtureName('travel-demo')).toBe('travel-demo');
    expect(normalizeFixtureName('demo')).toBe('travel-demo');
    expect(normalizeFixtureName('nope')).toBeNull();
  });

  it('seeds the demo trip into the travel store', () => {
    const result = seedAgentUiFixture('travel-demo');
    expect(result).toEqual({
      fixture: 'travel-demo',
      planId: AGENT_UI_DEMO_TRIP_ID,
      flightItemId: AGENT_UI_DEMO_FLIGHT_ID,
    });
    expect(mockSavePlan).toHaveBeenCalledTimes(1);
    expect(mockRecordPlanInteraction).toHaveBeenCalledWith(AGENT_UI_DEMO_TRIP_ID);
  });
});

describe('agent-ui stable createId', () => {
  it('consumes ordered agentUiItemIds then falls back', () => {
    let fallback = 0;
    const next = createIdFromAgentUiItemIds(
      [AGENT_UI_DEMO_CHASE_OUTBOUND_ID, AGENT_UI_DEMO_CHASE_RETURN_ID],
      () => `fallback-${++fallback}`,
    );
    expect(next()).toBe(AGENT_UI_DEMO_CHASE_OUTBOUND_ID);
    expect(next()).toBe(AGENT_UI_DEMO_CHASE_RETURN_ID);
    expect(next()).toBe('fallback-1');
    expect(
      createIdFromAgentUiItemIds(undefined, () => 'random')(),
    ).toBe('random');
  });
});

describe('agent-ui flows', () => {
  it('lists and resolves named flows', () => {
    expect(listAgentUiFlowNames()).toContain('travel-demo');
    expect(listAgentUiFlowNames()).toContain('open-new-trip');
    expect(listAgentUiFlowNames()).toContain('open-new-checklist');
    expect(listAgentUiFlowNames()).toContain('profile');
    expect(listAgentUiFlowNames()).toContain('health-settings');
    expect(listAgentUiFlowNames()).toContain('vehicles-new');
    expect(listAgentUiFlowNames()).toContain('workouts');
    const steps = resolveAgentUiFlow('travel-demo-add-flight');
    expect(steps?.[0]).toMatchObject({ op: 'seed', to: 'travel-demo' });
    expect(steps?.some((s) => s.op === 'goto')).toBe(true);
    expect(steps?.some((s) => s.op === 'wait')).toBe(true);
    expect(
      steps?.every(
        (s) => s.op !== 'wait' || s.ms != null || s.timeoutMs === AGENT_UI_WAIT_TIMEOUT_MS,
      ),
    ).toBe(true);
    expect(AGENT_UI_WAIT_TIMEOUT_MS).toBe(2000);
    const workouts = resolveAgentUiFlow('workouts');
    expect(workouts?.some((s) => s.op === 'wait' && s.to === '/workouts')).toBe(
      true,
    );
    expect(resolveAgentUiFlow('missing')).toBeNull();
  });

  it('lands Chase roundtrip submit on the expanded outbound passenger row', () => {
    const steps = resolveAgentUiFlow('travel-demo-add-flight-roundtrip');
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: 'tap',
          id: 'ontrack.travel.itineraryAdd.submit',
        }),
        expect.objectContaining({
          op: 'tap',
          id: `ontrack.travel.timelineItem.${AGENT_UI_DEMO_CHASE_OUTBOUND_ID}.default`,
        }),
        expect.objectContaining({
          op: 'wait',
          id: `ontrack.travel.flight.passenger.${AGENT_UI_DEMO_CHASE_OUTBOUND_ID}`,
        }),
      ]),
    );
  });
});
