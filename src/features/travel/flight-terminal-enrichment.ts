import { lookupFlightData } from './flight-status-client';
import type {
  TravelFlightDetails,
  TravelFlightLeg,
  TravelPlan,
} from './types';

type TerminalPair = {
  departureTerminal?: string;
  arrivalTerminal?: string;
};

type FlightTerminalPatch = TerminalPair & {
  legs?: TerminalPair[];
};

export type FlightTerminalPatches = Record<string, FlightTerminalPatch>;

async function terminalPairForLeg(
  leg: TravelFlightLeg,
): Promise<TerminalPair | undefined> {
  if (
    !leg.flightNumber ||
    !leg.date ||
    (leg.departureTerminal && leg.arrivalTerminal)
  ) {
    return undefined;
  }
  try {
    const result = await lookupFlightData({
      flightNumber: leg.flightNumber,
      date: leg.date,
      departureAirport: leg.departureAirport,
      arrivalAirport: leg.arrivalAirport,
      mode: 'terminals',
    });
    const pair = {
      departureTerminal:
        leg.departureTerminal || result.departureTerminal,
      arrivalTerminal: leg.arrivalTerminal || result.arrivalTerminal,
    };
    return pair.departureTerminal || pair.arrivalTerminal ? pair : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchFlightTerminalPatches(
  plan: TravelPlan,
): Promise<FlightTerminalPatches> {
  const entries = await Promise.all(
    plan.itinerary.map(async (item) => {
      if (item.kind !== 'flight' || !item.flight) return undefined;
      const details = item.flight;
      if (details.legs?.length) {
        const legs = await Promise.all(
          details.legs.map((leg) => terminalPairForLeg(leg)),
        );
        if (!legs.some(Boolean)) return undefined;
        return [
          item.id,
          {
            departureTerminal:
              details.departureTerminal ??
              legs[0]?.departureTerminal,
            arrivalTerminal:
              details.arrivalTerminal ??
              legs.at(-1)?.arrivalTerminal,
            legs: legs.map((pair) => pair ?? {}),
          },
        ] as const;
      }
      const pair = await terminalPairForLeg({
        flightNumber: details.flightNumber,
        date: item.date,
        departureAirport: details.departureAirport,
        departureTerminal: details.departureTerminal,
        arrivalAirport: details.arrivalAirport,
        arrivalTerminal: details.arrivalTerminal,
      });
      return pair ? ([item.id, pair] as const) : undefined;
    }),
  );
  return entries.reduce<FlightTerminalPatches>((patches, entry) => {
    if (entry) patches[entry[0]] = entry[1];
    return patches;
  }, {});
}

function applyDetailsPatch(
  details: TravelFlightDetails,
  patch: FlightTerminalPatch,
): TravelFlightDetails {
  return {
    ...details,
    departureTerminal:
      details.departureTerminal ?? patch.departureTerminal,
    arrivalTerminal: details.arrivalTerminal ?? patch.arrivalTerminal,
    ...(details.legs?.length && patch.legs
      ? {
          legs: details.legs.map((leg, index) => ({
            ...leg,
            departureTerminal:
              leg.departureTerminal ??
              patch.legs?.[index]?.departureTerminal,
            arrivalTerminal:
              leg.arrivalTerminal ?? patch.legs?.[index]?.arrivalTerminal,
          })),
        }
      : {}),
  };
}

export function applyFlightTerminalPatches(
  plan: TravelPlan,
  patches: FlightTerminalPatches,
): TravelPlan | undefined {
  let changed = false;
  const itinerary = plan.itinerary.map((item) => {
    const patch = patches[item.id];
    if (!item.flight || !patch) return item;
    const flight = applyDetailsPatch(item.flight, patch);
    if (JSON.stringify(flight) === JSON.stringify(item.flight)) return item;
    changed = true;
    return { ...item, flight };
  });
  return changed
    ? { ...plan, itinerary, updatedAt: new Date().toISOString() }
    : undefined;
}
