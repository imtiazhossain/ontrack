import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Persistence adapter for client stores. Centralized so the backing store
 * (AsyncStorage today, SQLite or a synced backend later) can be swapped
 * without touching feature code.
 */
export function createPersistStorage<T>() {
  return createJSONStorage<T>(() => AsyncStorage);
}

export const STORAGE_KEYS = {
  schedule: 'ontrack/schedule/v1',
  preferences: 'ontrack/preferences/v1',
} as const;
