import type { TravelPlan } from '@/features/travel/types';

/** Stable __DEV__ plan id — agents can deep-link without creating trips. */
export const AGENT_UI_DEMO_TRIP_ID = 'trip-agent-ui-demo';
/** Stable flight itinerary item on the demo trip. */
export const AGENT_UI_DEMO_FLIGHT_ID = 'item-agent-ui-demo-flight';
/** Stable connecting (multi-stop) flight so agents can verify both card shapes. */
export const AGENT_UI_DEMO_CONNECTING_FLIGHT_ID =
  'item-agent-ui-demo-connecting-flight';
/** Stable stay with an address so agents can exercise Open with… maps. */
export const AGENT_UI_DEMO_STAY_ID = 'item-agent-ui-demo-stay';
/** Chase round-trip fixture outbound (EWR → KEF) after importFlight=roundtrip submit. */
export const AGENT_UI_DEMO_CHASE_OUTBOUND_ID =
  'item-agent-ui-demo-chase-outbound';
/** Chase round-trip fixture return (KEF → EWR) after importFlight=roundtrip submit. */
export const AGENT_UI_DEMO_CHASE_RETURN_ID = 'item-agent-ui-demo-chase-return';

/**
 * Prefer ordered __DEV__ fixture ids, then fall back (e.g. `newId('trip-item')`).
 * Used when a pending import carries `agentUiItemIds`.
 */
export function createIdFromAgentUiItemIds(
  agentUiItemIds: string[] | undefined,
  fallback: () => string,
): () => string {
  let index = 0;
  return () => {
    const next = agentUiItemIds?.[index];
    if (typeof next === 'string' && next.trim()) {
      index += 1;
      return next.trim();
    }
    return fallback();
  };
}

export type AgentUiFixtureName = 'travel-demo';

export type AgentUiSeedResult = {
  fixture: AgentUiFixtureName;
  planId: string;
  flightItemId: string;
};

export function buildAgentUiDemoTrip(
  nowIso = new Date().toISOString(),
): TravelPlan {
  return {
    id: AGENT_UI_DEMO_TRIP_ID,
    title: 'Agent UI Demo',
    mode: 'flight',
    origin: 'New York, NY',
    destination: 'Lisbon, Portugal',
    startDate: '2026-09-27',
    endDate: '2026-09-30',
    notes: 'Stable __DEV__ fixture for agent navigation. Safe to overwrite.',
    itinerary: [
      {
        id: AGENT_UI_DEMO_FLIGHT_ID,
        kind: 'flight',
        title: 'UA 70',
        date: '2026-09-27',
        startMinutes: 18 * 60 + 30,
        durationMinutes: 420,
        flight: {
          airline: 'United',
          flightNumber: 'UA70',
          departureAirport: 'EWR',
          departureTerminal: 'C',
          departureGate: 'C71',
          arrivalAirport: 'LIS',
          arrivalTerminal: '1',
          arrivalGate: '18',
          confirmationCode: 'AGENTUI',
          passengerCount: 1,
        },
      },
      {
        // Terminals/gates live only at the booking level here, matching what the
        // flight editor stores, so the journey endpoints must inherit them.
        id: AGENT_UI_DEMO_CONNECTING_FLIGHT_ID,
        kind: 'flight',
        title: 'UA 1907',
        date: '2026-09-30',
        startMinutes: 90,
        durationMinutes: 599,
        flight: {
          airline: 'United Airlines',
          flightNumber: 'UA1907',
          departureAirport: 'GUA',
          departureTerminal: '1',
          departureGate: '5',
          arrivalAirport: 'LGA',
          arrivalTerminal: 'B',
          arrivalGate: '22',
          confirmationCode: 'HF7K2Q',
          passengerCount: 1,
          legs: [
            {
              airline: 'United Airlines',
              flightNumber: 'UA1907',
              departureAirport: 'GUA',
              arrivalAirport: 'IAH',
              aircraft: 'Boeing 737-800 Passenger',
              date: '2026-09-30',
              departureMinutes: 90,
              arrivalMinutes: 321,
              durationMinutes: 171,
              layoverMinutesAfter: 99,
            },
            {
              airline: 'United Airlines',
              flightNumber: 'UA1697',
              departureAirport: 'IAH',
              arrivalAirport: 'LGA',
              aircraft: 'Boeing 737 MAX 8',
              date: '2026-09-30',
              departureMinutes: 420,
              arrivalMinutes: 689,
              durationMinutes: 209,
            },
          ],
        },
      },
      {
        id: AGENT_UI_DEMO_STAY_ID,
        kind: 'stay',
        title: 'Demo Stay',
        date: '2026-09-27',
        startMinutes: 15 * 60,
        durationMinutes: 2 * 24 * 60,
        details: 'Rua Augusta 100, 1100-053 Lisboa, Portugal',
        stay: {
          checkoutDate: '2026-09-29',
          checkoutMinutes: 11 * 60,
          confirmationCode: 'STAYDEMO',
        },
      },
    ],
    participants: [],
    baseCurrency: 'USD',
    expenses: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: nowIso,
  };
}

export function seedAgentUiFixture(
  name: string | undefined,
): AgentUiSeedResult | null {
  const fixture = normalizeFixtureName(name);
  if (!fixture) return null;

  if (fixture === 'travel-demo') {
    // Lazy require keeps agent-ui unit tests free of Zustand/AsyncStorage.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useTravel } = require('@/store/travel') as typeof import('@/store/travel');
    const plan = buildAgentUiDemoTrip();
    const saved = useTravel.getState().savePlan(plan);
    if (!saved) return null;
    useTravel.getState().recordPlanInteraction(plan.id);
    return {
      fixture,
      planId: plan.id,
      flightItemId: AGENT_UI_DEMO_FLIGHT_ID,
    };
  }

  return null;
}

export function normalizeFixtureName(
  raw: string | undefined,
): AgentUiFixtureName | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (
    key === 'travel-demo' ||
    key === 'travel' ||
    key === 'demo' ||
    key === 'trip-agent-ui-demo'
  ) {
    return 'travel-demo';
  }
  return null;
}

export const AGENT_UI_FIXTURE_NAMES = ['travel-demo'] as const;
