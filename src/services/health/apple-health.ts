import * as Linking from 'expo-linking';

import HealthKit from '../../../modules/ontrack-healthkit';
import type { AppleStateOfMindInput, AppleStateOfMindSample, HealthImport } from '@/features/health/types';

export async function isAppleHealthAvailable() {
  return (await HealthKit?.isAvailableAsync()) ?? false;
}

export async function isStateOfMindAvailable() {
  return (await HealthKit?.isStateOfMindAvailableAsync()) ?? false;
}

export async function requestAppleHealthAccess(stateOfMindWrite: boolean) {
  if (!HealthKit) return false;
  return HealthKit.requestAuthorizationAsync({ stateOfMindWrite });
}

export async function queryAppleHealth90Days(): Promise<HealthImport> {
  if (!HealthKit) throw new Error('NATIVE_BUILD_REQUIRED');
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 89);
  start.setHours(0, 0, 0, 0);
  return HealthKit.queryHealthSummaryAsync({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export async function queryAppleStateOfMind90Days(): Promise<AppleStateOfMindSample[]> {
  if (!HealthKit) return [];
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 89);
  return HealthKit.queryStateOfMindAsync({ startDate: start.toISOString(), endDate: end.toISOString() });
}

export async function saveAppleStateOfMind(input: AppleStateOfMindInput) {
  if (!HealthKit) throw new Error('NATIVE_BUILD_REQUIRED');
  return HealthKit.saveStateOfMindAsync(input);
}

export async function deleteOwnedAppleStateOfMind(uuid: string) {
  if (!HealthKit) throw new Error('NATIVE_BUILD_REQUIRED');
  return HealthKit.deleteOwnedStateOfMindAsync(uuid);
}

export function openAppleHealth() {
  return Linking.openURL('x-apple-health://');
}
