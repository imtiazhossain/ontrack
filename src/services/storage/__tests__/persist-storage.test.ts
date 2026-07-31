import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
    createPersistStorage,
    resetPersistBackendForTests,
    STORAGE_KEYS,
} from '@/services/storage';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('createPersistStorage', () => {
  beforeEach(async () => {
    resetPersistBackendForTests();
    await mockAsyncStorage.clear();
  });

  it('round-trips JSON through the zustand storage adapter', async () => {
    const storage = createPersistStorage<{ hello: string }>();
    expect(storage).toBeTruthy();

    await storage!.setItem(STORAGE_KEYS.preferences, JSON.stringify({ hello: 'world' }));
    const raw = await storage!.getItem(STORAGE_KEYS.preferences);
    expect(raw).toBe(JSON.stringify({ hello: 'world' }));
    await storage!.removeItem(STORAGE_KEYS.preferences);
    expect(await storage!.getItem(STORAGE_KEYS.preferences)).toBeNull();
  });
});
