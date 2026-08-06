import { Platform } from 'react-native';

import {
    AGENT_UI_DEMO_ACTIVITY_ID,
    AGENT_UI_DEMO_CHASE_OUTBOUND_ID,
    AGENT_UI_DEMO_CHECKLIST_LIST_ID,
    AGENT_UI_DEMO_CHECKLIST_TASK_PLAN_ID,
    AGENT_UI_DEMO_FLIGHT_ID,
    AGENT_UI_DEMO_FOOD_ACTIVITY_ID,
    AGENT_UI_DEMO_GROCERY_LIST_ID,
    AGENT_UI_DEMO_GROCERY_RECIPE_ID,
    AGENT_UI_DEMO_HEALTH_FACTOR_ID,
    AGENT_UI_DEMO_HEALTH_MOOD_ID,
    AGENT_UI_DEMO_PLANT_ID,
    AGENT_UI_DEMO_TRIP_ID,
    AGENT_UI_DEMO_VEHICLE_ID,
    AGENT_UI_DEMO_VISION_CATEGORY_ID,
    AGENT_UI_DEMO_VISION_ITEM_ID,
    AGENT_UI_DEMO_WORKOUT_ACTIVITY_ID,
    AGENT_UI_DEMO_WORKOUT_CATALOG_EXERCISE_ID,
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
/** Android mount/hydration after seed+goto is slower than iOS Simulator. */
export const AGENT_UI_ANDROID_WAIT_TIMEOUT_MS = 4000;

function flowWaitTimeoutMs(): number {
  return Platform.OS === 'android'
    ? AGENT_UI_ANDROID_WAIT_TIMEOUT_MS
    : AGENT_UI_WAIT_TIMEOUT_MS;
}

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
  'travel-demo-add-flight-connecting': [
    { op: 'seed', to: 'travel-demo' },
    {
      op: 'goto',
      to: `travel/${AGENT_UI_DEMO_TRIP_ID}/add/flight?importFlight=connecting`,
    },
    {
      op: 'wait',
      prefix: 'ontrack.travel.itineraryAdd.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    // Import prefills settle after mount (parse + setTitle).
    { op: 'wait', ms: 350 },
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
  'activity-demo': [
    { op: 'seed', to: 'activity-demo' },
    { op: 'goto', to: 'today' },
    {
      op: 'wait',
      id: `ontrack.today.activity.${AGENT_UI_DEMO_ACTIVITY_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'activity-demo-edit': [
    { op: 'seed', to: 'activity-demo' },
    { op: 'goto', to: `activityForm?id=${AGENT_UI_DEMO_ACTIVITY_ID}` },
    {
      op: 'wait',
      // Title when editing; guidedTitle/date also settle the form.
      prefix: 'ontrack.activityForm.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'food-demo': [
    { op: 'seed', to: 'food-demo' },
    { op: 'goto', to: `detail/food/${AGENT_UI_DEMO_FOOD_ACTIVITY_ID}` },
    {
      op: 'wait',
      id: 'ontrack.food.detail.edit',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'activity-demo-detail': [
    { op: 'seed', to: 'activity-demo' },
    { op: 'goto', to: 'today' },
    {
      op: 'wait',
      id: `ontrack.today.activity.${AGENT_UI_DEMO_ACTIVITY_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    {
      op: 'tap',
      id: `ontrack.today.activity.${AGENT_UI_DEMO_ACTIVITY_ID}`,
    },
    {
      op: 'wait',
      id: 'ontrack.eventDetail.edit',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
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
  'checklist-demo': [
    { op: 'seed', to: 'checklist-demo' },
    { op: 'goto', to: `checklists/${AGENT_UI_DEMO_CHECKLIST_LIST_ID}` },
    {
      op: 'wait',
      id: `ontrack.checklists.detail.task.${AGENT_UI_DEMO_CHECKLIST_TASK_PLAN_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'checklist-demo-list': [
    { op: 'seed', to: 'checklist-demo' },
    { op: 'goto', to: 'checklists' },
    {
      op: 'wait',
      id: `ontrack.checklists.list.${AGENT_UI_DEMO_CHECKLIST_LIST_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'grocery-demo': [
    { op: 'seed', to: 'grocery-demo' },
    { op: 'goto', to: `checklists/${AGENT_UI_DEMO_GROCERY_LIST_ID}` },
    {
      op: 'wait',
      id: `ontrack.grocery.detail.recipe.${AGENT_UI_DEMO_GROCERY_RECIPE_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'grocery-demo-combined': [
    { op: 'seed', to: 'grocery-demo' },
    { op: 'goto', to: `checklists/${AGENT_UI_DEMO_GROCERY_LIST_ID}` },
    {
      op: 'wait',
      id: 'ontrack.grocery.detail.view.combined',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.grocery.detail.view.combined' },
    {
      op: 'wait',
      id: 'ontrack.grocery.detail.copy',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'grocery-demo-recipe-import': [
    { op: 'seed', to: 'grocery-demo' },
    {
      op: 'goto',
      to: `checklists/${AGENT_UI_DEMO_GROCERY_LIST_ID}/recipe-import`,
    },
    {
      op: 'wait',
      id: 'ontrack.recipeImport.url',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'grocery-demo-settings': [
    { op: 'seed', to: 'grocery-demo' },
    { op: 'goto', to: `checklists/${AGENT_UI_DEMO_GROCERY_LIST_ID}` },
    {
      op: 'wait',
      id: 'ontrack.grocery.detail.settings',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.grocery.detail.settings' },
    {
      op: 'wait',
      id: 'ontrack.listSettings.name',
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
  'health-demo': [
    { op: 'seed', to: 'health-demo' },
    { op: 'goto', to: 'health' },
    {
      op: 'wait',
      prefix: 'ontrack.health.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.health.section.mind' },
    {
      op: 'wait',
      id: `ontrack.health.mind.entry.${AGENT_UI_DEMO_HEALTH_MOOD_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'health-demo-mood': [
    { op: 'seed', to: 'health-demo' },
    { op: 'goto', to: 'health/mood' },
    {
      op: 'wait',
      id: `ontrack.health.checkIn.factor.${AGENT_UI_DEMO_HEALTH_FACTOR_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
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
    {
      op: 'wait',
      id: 'ontrack.vehicles.new.nickname',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'vehicle-demo': [
    { op: 'seed', to: 'vehicle-demo' },
    { op: 'goto', to: 'vehicles' },
    {
      op: 'wait',
      id: `ontrack.vehicles.list.vehicle.${AGENT_UI_DEMO_VEHICLE_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'vehicle-demo-detail': [
    { op: 'seed', to: 'vehicle-demo' },
    { op: 'goto', to: `vehicles/${AGENT_UI_DEMO_VEHICLE_ID}` },
    {
      op: 'wait',
      id: 'ontrack.vehicles.detail.settings',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'vehicle-demo-expenses': [
    { op: 'seed', to: 'vehicle-demo' },
    { op: 'goto', to: `vehicles/${AGENT_UI_DEMO_VEHICLE_ID}` },
    {
      op: 'wait',
      id: 'ontrack.vehicles.detail.section.expenses',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.vehicles.detail.section.expenses' },
    {
      op: 'wait',
      id: 'ontrack.vehicles.expenses.amount',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  social: [
    { op: 'goto', to: 'social' },
    { op: 'wait', prefix: 'ontrack.social.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  workouts: [
    { op: 'goto', to: 'workouts' },
    {
      op: 'wait',
      prefix: 'ontrack.workouts.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'workouts-demo': [
    { op: 'seed', to: 'workouts-demo' },
    { op: 'goto', to: 'workouts' },
    {
      op: 'wait',
      id: `ontrack.workouts.todayPlan.${AGENT_UI_DEMO_WORKOUT_ACTIVITY_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'workouts-demo-explore': [
    { op: 'seed', to: 'workouts-demo' },
    { op: 'goto', to: 'workouts' },
    {
      op: 'wait',
      id: `ontrack.workouts.exercise.${AGENT_UI_DEMO_WORKOUT_CATALOG_EXERCISE_ID}.add`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'workouts-demo-anatomy': [
    { op: 'seed', to: 'workouts-demo' },
    { op: 'goto', to: 'workouts' },
    {
      op: 'wait',
      id: 'ontrack.workouts.explorer.anatomySex.male',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.workouts.explorer.anatomySex.female' },
    {
      op: 'wait',
      id: 'ontrack.workouts.explorer.bodyView.front',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.workouts.explorer.bodyView.side' },
    {
      op: 'wait',
      id: 'ontrack.workouts.explorer.muscle.chest',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'workouts-demo-gym-detail': [
    { op: 'seed', to: 'workouts-demo' },
    {
      op: 'goto',
      to: `detail/gym/${AGENT_UI_DEMO_WORKOUT_ACTIVITY_ID}`,
    },
    {
      op: 'wait',
      id: 'ontrack.workouts.gym.start',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'workouts-demo-gym-active': [
    { op: 'seed', to: 'workouts-demo' },
    {
      op: 'goto',
      to: `detail/gym-active/${AGENT_UI_DEMO_WORKOUT_ACTIVITY_ID}`,
    },
    {
      op: 'wait',
      id: 'ontrack.workouts.gymActive.completeSet',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  plants: [
    { op: 'goto', to: 'plants' },
    {
      op: 'wait',
      prefix: 'ontrack.plants.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'plants-new': [
    { op: 'goto', to: 'plants/new' },
    {
      op: 'wait',
      id: 'ontrack.plants.new.camera',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'plants-demo': [
    { op: 'seed', to: 'plants-demo' },
    { op: 'goto', to: `plants/${AGENT_UI_DEMO_PLANT_ID}` },
    {
      op: 'wait',
      id: 'ontrack.plants.detail.logWatering',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'plants-demo-list': [
    { op: 'seed', to: 'plants-demo' },
    { op: 'goto', to: 'plants' },
    {
      op: 'wait',
      id: `ontrack.plants.list.plant.${AGENT_UI_DEMO_PLANT_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'plants-demo-log-watering': [
    { op: 'seed', to: 'plants-demo' },
    { op: 'goto', to: `plants/${AGENT_UI_DEMO_PLANT_ID}` },
    {
      op: 'wait',
      id: 'ontrack.plants.detail.logWatering',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.plants.detail.logWatering' },
    {
      op: 'wait',
      id: 'ontrack.plants.detail.undoWatering',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'vision-board': [
    { op: 'goto', to: 'vision-board' },
    {
      op: 'wait',
      prefix: 'ontrack.vision.',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'vision-board-demo': [
    { op: 'seed', to: 'vision-board-demo' },
    { op: 'goto', to: 'vision-board' },
    {
      op: 'wait',
      id: `ontrack.vision.consolidated.category.${AGENT_UI_DEMO_VISION_CATEGORY_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'vision-board-demo-edit': [
    { op: 'seed', to: 'vision-board-demo' },
    { op: 'goto', to: `vision-board/${AGENT_UI_DEMO_VISION_CATEGORY_ID}` },
    {
      op: 'wait',
      id: 'ontrack.vision.category.addAffirmation',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    {
      op: 'wait',
      id: `ontrack.vision.category.canvasItem.${AGENT_UI_DEMO_VISION_ITEM_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  'vision-board-demo-item-editor': [
    { op: 'seed', to: 'vision-board-demo' },
    { op: 'goto', to: `vision-board/${AGENT_UI_DEMO_VISION_CATEGORY_ID}` },
    {
      op: 'wait',
      id: `ontrack.vision.category.canvasItem.${AGENT_UI_DEMO_VISION_ITEM_ID}`,
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    {
      op: 'tap',
      id: `ontrack.vision.category.canvasItem.${AGENT_UI_DEMO_VISION_ITEM_ID}`,
    },
    {
      op: 'wait',
      id: 'ontrack.vision.category.selection.edit',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.vision.category.selection.edit' },
    {
      op: 'wait',
      id: 'ontrack.vision.itemEditor.primary',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
  ],
  games: [
    { op: 'goto', to: 'games' },
    { op: 'wait', prefix: 'ontrack.games.', timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS },
  ],
  'games-balloon-pop': [
    { op: 'goto', to: 'games' },
    {
      op: 'wait',
      id: 'ontrack.games.hub.balloonPop',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
    { op: 'tap', id: 'ontrack.games.hub.balloonPop' },
    {
      op: 'wait',
      id: 'ontrack.games.balloonPop.play',
      timeoutMs: AGENT_UI_WAIT_TIMEOUT_MS,
    },
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
  const waitMs = flowWaitTimeoutMs();
  return steps.map((step) => {
    const next: AgentUiFlowStep = { ...step };
    if (
      next.op === 'wait' &&
      next.timeoutMs != null &&
      next.timeoutMs === AGENT_UI_WAIT_TIMEOUT_MS
    ) {
      next.timeoutMs = waitMs;
    }
    return next;
  });
}
