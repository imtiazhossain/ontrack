import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { ALL_ACCOUNTS_TEST_TRIP } from '@/constants/travel';
import { STORAGE_KEYS } from '@/services/storage';
import { useTravel } from '@/store/travel';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('disabled all-accounts travel test fixture', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    useTravel.getState().reset();
  });

  it('is absent from a reset travel store', () => {
    expect(useTravel.getState().plans).not.toContainEqual(ALL_ACCOUNTS_TEST_TRIP);
  });

  it('is removed from existing persisted account trips', async () => {
    await mockAsyncStorage.setItem(
      STORAGE_KEYS.travel,
      JSON.stringify({
        state: {
          plans: [
            {
              ...ALL_ACCOUNTS_TEST_TRIP,
              title: 'Stale test trip',
            },
            {
              ...ALL_ACCOUNTS_TEST_TRIP,
              id: 'trip-personal',
              title: 'Personal trip',
            },
          ],
        },
        version: 0,
      }),
    );

    await useTravel.persist.rehydrate();

    expect(useTravel.getState().plans).toEqual([
      expect.objectContaining({ id: 'trip-personal', title: 'Personal trip' }),
    ]);
  });

  it('stays absent when cloud sync replaces an account with no trips', () => {
    useTravel.getState().replacePlans([]);

    expect(useTravel.getState().plans).toEqual([]);
  });
});
