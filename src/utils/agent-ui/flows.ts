import {
  AGENT_UI_DEMO_FLIGHT_ID,
  AGENT_UI_DEMO_TRIP_ID,
} from './fixtures';

/** Minimal step shape for named flows (expanded by `op=flow`). */
export type AgentUiFlowStep = {
  op: string;
  to?: string;
  id?: string;
  prefix?: string;
  timeoutMs?: number;
  ms?: number;
};

/**
 * Named multi-step recipes. Expanded in-app by `op=flow` so one host round trip
 * covers seed → navigate → settle → tap.
 */
export const AGENT_UI_FLOWS = {
  'travel-list': [
    { op: 'goto', to: 'travel' },
    { op: 'wait', prefix: 'ontrack.travel.', timeoutMs: 4000 },
  ],
  'travel-demo': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: `travel/${AGENT_UI_DEMO_TRIP_ID}` },
    { op: 'wait', prefix: 'ontrack.travel.planDetail.', timeoutMs: 5000 },
  ],
  'travel-demo-list': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: 'travel' },
    {
      op: 'wait',
      id: `ontrack.travel.list.itinerary.${AGENT_UI_DEMO_TRIP_ID}`,
      timeoutMs: 5000,
    },
  ],
  'travel-demo-add-flight': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: `travel/${AGENT_UI_DEMO_TRIP_ID}/add/flight` },
    { op: 'wait', prefix: 'ontrack.travel.itineraryAdd.', timeoutMs: 5000 },
  ],
  'travel-demo-edit-flight': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: `travel/${AGENT_UI_DEMO_TRIP_ID}` },
    { op: 'wait', prefix: 'ontrack.travel.planDetail.', timeoutMs: 5000 },
    {
      op: 'tap',
      id: `ontrack.travel.timelineItem.${AGENT_UI_DEMO_FLIGHT_ID}.editFlight`,
    },
    {
      op: 'wait',
      id: `ontrack.travel.detailsEditor.save.${AGENT_UI_DEMO_FLIGHT_ID}`,
      timeoutMs: 5000,
    },
  ],
  'open-new-trip': [
    { op: 'goto', to: 'travel' },
    { op: 'wait', prefix: 'ontrack.travel.', timeoutMs: 4000 },
    { op: 'tap', id: 'ontrack.travel.newTrip.open' },
    { op: 'wait', id: 'ontrack.travel.newTrip.title', timeoutMs: 4000 },
  ],
  calendar: [
    { op: 'goto', to: 'calendar' },
    { op: 'wait', prefix: 'ontrack.calendar.', timeoutMs: 4000 },
  ],
  today: [
    { op: 'goto', to: 'today' },
    { op: 'wait', prefix: 'ontrack.today.', timeoutMs: 4000 },
  ],
  checklists: [
    { op: 'goto', to: 'checklists' },
    { op: 'wait', prefix: 'ontrack.checklists.', timeoutMs: 4000 },
  ],
  health: [
    { op: 'goto', to: 'health' },
    { op: 'wait', prefix: 'ontrack.health.', timeoutMs: 4000 },
  ],
  'health-mood': [
    { op: 'goto', to: 'health/mood' },
    { op: 'wait', prefix: 'ontrack.health.', timeoutMs: 4000 },
  ],
  'activity-form': [
    { op: 'goto', to: 'activityForm' },
    { op: 'wait', prefix: 'ontrack.activityForm.', timeoutMs: 4000 },
  ],
} as const satisfies Record<string, readonly AgentUiFlowStep[]>;

export type AgentUiFlowName = keyof typeof AGENT_UI_FLOWS;

export function listAgentUiFlowNames(): AgentUiFlowName[] {
  return Object.keys(AGENT_UI_FLOWS) as AgentUiFlowName[];
}

export function resolveAgentUiFlow(
  name: string | undefined,
): AgentUiFlowStep[] | null {
  if (!name) return null;
  const key = name.trim() as AgentUiFlowName;
  const steps = AGENT_UI_FLOWS[key];
  if (!steps) return null;
  return steps.map((step) => ({ ...step }));
}
