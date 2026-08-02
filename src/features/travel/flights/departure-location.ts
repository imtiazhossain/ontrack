import {
  formatPlaceAddress,
  getCurrentPlaceLabel,
  type DevicePlaceResult,
} from '@/utils/device-location';

export type DepartureLocationResult = DevicePlaceResult;

/** @deprecated Prefer `formatPlaceAddress` from `@/utils/device-location`. */
export const formatDepartureAddress = formatPlaceAddress;

/** Suggests a departure city from the device location. */
export function getCurrentDepartureLocation(): Promise<DepartureLocationResult> {
  return getCurrentPlaceLabel();
}
