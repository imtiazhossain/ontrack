import { useAccountFlags } from '@/store/account-flags';

/**
 * Developer Tools / Dev Mode require a server-granted `account_flags.developer_tools`
 * flag. Never gate on emails or other personal identifiers in client code.
 * Available in release builds (e.g. TestFlight/OTA) for flagged accounts only.
 */
export function hasDeveloperToolsFlag(): boolean {
  return useAccountFlags.getState().developerTools;
}

export function canUseDeveloperTools(): boolean {
  return hasDeveloperToolsFlag();
}

/** Reactive gate for Profile / route screens. */
export function useCanUseDeveloperTools(): boolean {
  const developerTools = useAccountFlags((state) => state.developerTools);
  const status = useAccountFlags((state) => state.status);
  if (status !== 'ready') return false;
  return developerTools;
}
