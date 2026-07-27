import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { ALL_ACCOUNTS_TEST_TRIP } from '@/constants/travel';
import { STORAGE_KEYS } from '@/services/storage';
import { useTravel } from '@/store/travel';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('all-accounts travel test fixture', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    useTravel.getState().reset();
  });

  it('is present in a reset travel store and cannot be removed', () => {
    expect(useTravel.getState().plans).toContainEqual(ALL_ACCOUNTS_TEST_TRIP);

    useTravel.getState().removePlan(ALL_ACCOUNTS_TEST_TRIP.id);

    expect(useTravel.getState().plans).toContainEqual(ALL_ACCOUNTS_TEST_TRIP);
  });

  it('is added to existing persisted account trips without duplication', async () => {
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
      ALL_ACCOUNTS_TEST_TRIP,
      expect.objectContaining({ id: 'trip-personal', title: 'Personal trip' }),
    ]);
  });

  it('is retained when cloud sync replaces an account with no trips', () => {
    useTravel.getState().replacePlans([]);

    expect(useTravel.getState().plans).toEqual([ALL_ACCOUNTS_TEST_TRIP]);
  });
});
