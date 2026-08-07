/** Minimal surface so unit tests can drive apply without native expo-updates. */
export type OtaUpdatesClient = {
  isEnabled: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<{ isNew: boolean }>;
  /** Kept for callers/tests; same-session reload is intentionally unused. */
  reloadAsync: () => Promise<void>;
};

export type ApplyOtaResult = 'skipped' | 'noop' | 'downloaded';

/**
 * Check → download only. Do **not** call `reloadAsync` in-session.
 *
 * Same-session reload races Expo Fabric view creation on iOS (TestFlight):
 * `ExpoFabricView` fatals with "The app context has been lost", then
 * `expo-updates` ErrorRecovery re-raises on `errorRecoveryQueue` as SIGABRT.
 * That shows up when opening heavy surfaces (itinerary) right after an OTA
 * apply. expo-updates will launch the downloaded bundle on the next cold start.
 */
export async function applyAvailableOtaUpdate(
  updates: OtaUpdatesClient,
): Promise<ApplyOtaResult> {
  if (!updates.isEnabled) return 'skipped';
  const check = await updates.checkForUpdateAsync();
  if (!check.isAvailable) return 'noop';
  const fetched = await updates.fetchUpdateAsync();
  if (!fetched.isNew) return 'noop';
  return 'downloaded';
}
