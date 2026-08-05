import {
    AGENT_UI_DEMO_CHASE_OUTBOUND_ID,
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
/** Default in-app wait ceiling — fail fast; polls every 16ms and returns early. */
export const AGENT_UI_WAIT_TIMEOUT_MS = 2000;

export const AGENT_UI_FLOWS = {
  'travel-list': [
    { op: 'goto', to: 'travel' },
    { op: 'wait', prefix: 'ontrack.travel.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'travel-demo': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: `travel/${AGENT_UI_DEMO_TRIP_ID}` },
    {
      op: 'wait',
      prefix: 'ontrack.travel.planDetail.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'travel-demo-list': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: 'travel' },
    {
      op: 'wait',
      id: `ontrack.travel.list.itinerary.${AGENT_UI_DEMO_TRIP_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'travel-demo-add-flight': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: `travel/${AGENT_UI_DEMO_TRIP_ID}/add/flight` },
    {
      op: 'wait',
      prefix: 'ontrack.travel.itineraryAdd.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'travel-demo-add-flight-roundtrip': [
    { op: 'seed', to: 'travel-demo' },
    {
      op: 'goto',
      to: `travel/${AGENT_UI_DEMO_TRIP_ID}/add/flight?importFlight=roundtrip`,
    },
    {
      op: 'wait',
      prefix: 'ontrack.travel.itineraryAdd.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    // Import prefills settle after mount; keep a short pure delay.
    { op: 'wait', ms: 200 },
    { op: 'tap', id: 'ontrack.travel.itineraryAdd.submit' },
    {
      op: 'wait',
      id: `ontrack.travel.timelineItem.${AGENT_UI_DEMO_CHASE_OUTBOUND_ID}.default`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    {
      op: 'tap',
      id: `ontrack.travel.timelineItem.${AGENT_UI_DEMO_CHASE_OUTBOUND_ID}.default`,
    },
    {
      op: 'wait',
      id: `ontrack.travel.flight.passenger.${AGENT_UI_DEMO_CHASE_OUTBOUND_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'travel-demo-edit-flight': [
    { op: 'seed', to: 'travel-demo' },
    { op: 'goto', to: `travel/${AGENT_UI_DEMO_TRIP_ID}` },
    {
      op: 'wait',
      prefix: 'ontrack.travel.planDetail.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    {
      op: 'tap',
      id: `ontrack.travel.timelineItem.${AGENT_UI_DEMO_FLIGHT_ID}.editFlight`,
    },
    {
      op: 'wait',
      id: `ontrack.travel.detailsEditor.save.${AGENT_UI_DEMO_FLIGHT_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'open-new-trip': [
    { op: 'goto', to: 'travel' },
    { op: 'wait', prefix: 'ontrack.travel.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
    { op: 'tap', id: 'ontrack.travel.newTrip.open' },
    {
      op: 'wait',
      id: 'ontrack.travel.newTrip.title',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  calendar: [
    { op: 'goto', to: 'calendar' },
    { op: 'wait', prefix: 'ontrack.calendar.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  today: [
    { op: 'goto', to: 'today' },
    { op: 'wait', prefix: 'ontrack.today.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  checklists: [
    { op: 'goto', to: 'checklists' },
    {
      op: 'wait',
      prefix: 'ontrack.checklists.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'open-new-checklist': [
    { op: 'goto', to: 'checklists' },
    {
      op: 'wait',
      prefix: 'ontrack.checklists.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    {
      op: 'wait',
      id: 'ontrack.checklists.newListName',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  health: [
    { op: 'goto', to: 'health' },
    { op: 'wait', prefix: 'ontrack.health.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'health-mood': [
    { op: 'goto', to: 'health/mood' },
    { op: 'wait', prefix: 'ontrack.health.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'health-settings': [
    { op: 'goto', to: 'health/settings' },
    { op: 'wait', prefix: 'ontrack.health.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'activity-form': [
    { op: 'goto', to: 'activityForm' },
    {
      op: 'wait',
      prefix: 'ontrack.activityForm.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  profile: [
    { op: 'goto', to: 'profile' },
    { op: 'wait', prefix: 'ontrack.profile.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  vehicles: [
    { op: 'goto', to: 'vehicles' },
    { op: 'wait', prefix: 'ontrack.vehicles.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'vehicles-new': [
    { op: 'goto', to: 'vehicles/new' },
    { op: 'wait', prefix: 'ontrack.vehicles.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  social: [
    { op: 'goto', to: 'social' },
    { op: 'wait', prefix: 'ontrack.social.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  workouts: [
    { op: 'goto', to: 'workouts' },
    { op: 'wait', to: '/workouts', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  plants: [
    { op: 'goto', to: 'plants' },
    { op: 'wait', to: '/plants', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'plants-new': [
    { op: 'goto', to: 'plants/new' },
    { op: 'wait', to: '/plants', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'vision-board': [
    { op: 'goto', to: 'vision-board' },
    { op: 'wait', to: '/vision-board', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  games: [
    { op: 'goto', to: 'games' },
    { op: 'wait', prefix: 'ontrack.games.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
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
