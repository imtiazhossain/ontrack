import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import type { Vehicle } from '@/features/vehicles/types';
import { vehicleDisplayTitle, vehicleFitmentLabel } from '@/features/vehicles/types';

export const ONTRACK_VEHICLE_SHARE_URL =
  process.env.EXPO_PUBLIC_VEHICLE_SHARE_BASE_URL ??
  process.env.EXPO_PUBLIC_TODO_SHARE_BASE_URL ??
  'https://ontrack--links.expo.app';

export function vehicleShareUrl(code: string): string {
  return `${ONTRACK_VEHICLE_SHARE_URL.replace(/\/$/, '')}/v/${code}`;
}

export function formatVehicleSummary(vehicle: Vehicle): string {
  const title = vehicleDisplayTitle(vehicle);
  const fitment = vehicleFitmentLabel(vehicle);
  const miles =
    vehicle.odometerMiles !== undefined
      ? `${vehicle.odometerMiles.toLocaleString()} mi`
      : undefined;
  const lines = [
    `🚗 ${title}`,
    fitment || undefined,
    miles ? `Odometer: ${miles}` : undefined,
    '',
    'Shared on onTrack',
  ].filter((line): line is string => line !== undefined);
  return lines.join('\n');
}

export async function copyVehicleShareLink(code: string): Promise<boolean> {
  return Clipboard.setStringAsync(vehicleShareUrl(code));
}

export async function shareVehicleInvite(
  vehicle: Vehicle,
  code: string,
): Promise<boolean> {
  const url = vehicleShareUrl(code);
  const result = await Share.share(
    {
      title: `${vehicleDisplayTitle(vehicle)} · onTrack`,
      message: `${formatVehicleSummary(vehicle)}\n\nJoin: ${url}`,
      url,
    },
    { subject: vehicleDisplayTitle(vehicle) },
  );
  return result.action !== Share.dismissedAction;
}
