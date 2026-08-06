import { useAccountFlags } from '@/store/account-flags';

/**
 * Developer Tools / Dev Mode require a server-granted `account_flags.developer_tools`
 * flag (plus __DEV__). Never gate on emails or other personal identifiers in client code.
 */
export function hasDeveloperToolsFlag(): boolean {
  return useAccountFlags.getState().developerTools;
}

export function canUseDeveloperTools(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ && hasDeveloperToolsFlag();
}

/** Reactive gate for Profile / route screens. */
export function useCanUseDeveloperTools(): boolean {
  const developerTools = useAccountFlags((state) => state.developerTools);
  const status = useAccountFlags((state) => state.status);
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  if (status !== 'ready') return false;
  return developerTools;
}
