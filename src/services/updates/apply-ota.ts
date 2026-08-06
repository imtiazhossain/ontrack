/** Minimal surface so unit tests can drive apply without native expo-updates. */
export type OtaUpdatesClient = {
  isEnabled: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<{ isNew: boolean }>;
  reloadAsync: () => Promise<void>;
};

export type ApplyOtaResult = 'skipped' | 'noop' | 'reloaded';

/**
 * Check → download → reload so a published OTA applies in the same session
 * instead of waiting for the next cold start.
 */
export async function applyAvailableOtaUpdate(
  updates: OtaUpdatesClient,
): Promise<ApplyOtaResult> {
  if (!updates.isEnabled) return 'skipped';
  const check = await updates.checkForUpdateAsync();
  if (!check.isAvailable) return 'noop';
  const fetched = await updates.fetchUpdateAsync();
  if (!fetched.isNew) return 'noop';
  await updates.reloadAsync();
  return 'reloaded';
}
