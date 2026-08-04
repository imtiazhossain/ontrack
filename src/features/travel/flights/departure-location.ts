import {
  formatPlaceAddress,
  getCurrentPlaceLabel,
  type DevicePlaceAddress,
  type DevicePlaceResult,
} from '@/utils/device-location';

export type DepartureLocationResult = DevicePlaceResult;

/** Flight searches need a city, not a neighborhood returned as `district`. */
export function formatDepartureAddress(address: DevicePlaceAddress): string | undefined {
  return formatPlaceAddress({
    ...address,
    district: address.city ? null : address.district,
  });
}

/** Suggests a departure city from the device location. */
export function getCurrentDepartureLocation(): Promise<DepartureLocationResult> {
  return getCurrentPlaceLabel(formatDepartureAddress);
}
