import type { AppIconName } from '@/design-system';
import type {
  TravelPlanMode,
  TravelTransportMode,
} from '@/features/travel/types';

export const TRAVEL_PLAN_MODES: readonly {
  value: TravelPlanMode;
  label: string;
  icon: AppIconName;
}[] = [
  { value: 'flight', label: 'Flight', icon: 'flight' },
  { value: 'road', label: 'Road', icon: 'vehicles' },
  { value: 'train', label: 'Train', icon: 'train' },
  { value: 'bus', label: 'Bus', icon: 'bus' },
  { value: 'ferry', label: 'Ferry', icon: 'ferry' },
  { value: 'transit', label: 'Transit', icon: 'transit' },
  { value: 'mixed', label: 'Mixed', icon: 'route' },
  { value: 'other', label: 'Other', icon: 'itinerary' },
] as const;

export const TRAVEL_TRANSPORT_MODES: readonly {
  value: TravelTransportMode;
  label: string;
  icon: AppIconName;
}[] = [
  { value: 'driving', label: 'Driving', icon: 'vehicles' },
  { value: 'train', label: 'Train', icon: 'train' },
  { value: 'bus', label: 'Bus', icon: 'bus' },
  { value: 'subway', label: 'Subway', icon: 'subway' },
  { value: 'tram', label: 'Tram', icon: 'tram' },
  { value: 'ferry', label: 'Ferry', icon: 'ferry' },
  { value: 'rideshare', label: 'Rideshare', icon: 'rideshare' },
  { value: 'taxi', label: 'Taxi', icon: 'taxi' },
  { value: 'shuttle', label: 'Shuttle', icon: 'shuttle' },
  { value: 'other', label: 'Other', icon: 'route' },
] as const;

export const TRAVEL_PLAN_MODE_VALUES = new Set<TravelPlanMode>(
  TRAVEL_PLAN_MODES.map((entry) => entry.value),
);
export const TRAVEL_TRANSPORT_MODE_VALUES = new Set<TravelTransportMode>(
  TRAVEL_TRANSPORT_MODES.map((entry) => entry.value),
);

export function travelPlanModeLabel(mode: TravelPlanMode): string {
  return TRAVEL_PLAN_MODES.find((entry) => entry.value === mode)?.label ?? 'Trip';
}

export function travelPlanModeIcon(mode: TravelPlanMode): AppIconName {
  return TRAVEL_PLAN_MODES.find((entry) => entry.value === mode)?.icon ?? 'itinerary';
}

export function transportModeLabel(mode: TravelTransportMode): string {
  return TRAVEL_TRANSPORT_MODES.find((entry) => entry.value === mode)?.label ?? 'Transport';
}

export function transportModeIcon(mode: TravelTransportMode): AppIconName {
  return TRAVEL_TRANSPORT_MODES.find((entry) => entry.value === mode)?.icon ?? 'route';
}

export function promotesFlightSearch(mode: TravelPlanMode): boolean {
  return mode === 'flight' || mode === 'mixed';
}
