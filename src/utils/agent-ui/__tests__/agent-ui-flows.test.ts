import {
  AGENT_UI_DEMO_FLIGHT_ID,
  AGENT_UI_DEMO_TRIP_ID,
  buildAgentUiDemoTrip,
  normalizeFixtureName,
  seedAgentUiFixture,
} from '../fixtures';
import { listAgentUiFlowNames, resolveAgentUiFlow } from '../flows';

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

describe('agent-ui flows', () => {
  it('lists and resolves named flows', () => {
    expect(listAgentUiFlowNames()).toContain('travel-demo');
    expect(listAgentUiFlowNames()).toContain('open-new-trip');
    const steps = resolveAgentUiFlow('travel-demo-add-flight');
    expect(steps?.[0]).toMatchObject({ op: 'seed', to: 'travel-demo' });
    expect(steps?.some((s) => s.op === 'goto')).toBe(true);
    expect(steps?.some((s) => s.op === 'wait')).toBe(true);
    expect(resolveAgentUiFlow('missing')).toBeNull();
  });
});
