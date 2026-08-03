import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * Node 25+ exposes a broken global `localStorage` (getItem is not a function)
 * that crashes Expo's SSR/Metro path during Fast Refresh. Only use real Storage.
 */
function getUsableWebStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (!storage || typeof storage.getItem !== 'function') return null;
    return storage;
  } catch {
    return null;
  }
}

// Web cannot use SecureStore. localStorage remains XSS-readable; keep the web
// surface minimal, enforce CSP, and prefer native builds for full auth sessions.
const webStorage = {
  getItem: (key: string) => getUsableWebStorage()?.getItem(key) ?? null,
  setItem: (key: string, value: string) => {
    getUsableWebStorage()?.setItem(key, value);
  },
  removeItem: (key: string) => {
    getUsableWebStorage()?.removeItem(key);
  },
};

let client: SupabaseClient | undefined;

/** Returns undefined until the high-compliance cloud environment is configured. */
export function getSupabaseClient(): SupabaseClient | undefined {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return undefined;
  client = createClient(url, publishableKey, {
    auth: {
      storage: process.env.EXPO_OS === 'web' ? webStorage : secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}
