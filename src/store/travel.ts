import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  ALL_ACCOUNTS_TEST_TRIP,
  withAllAccountsTestTrip,
} from '@/constants/travel';
import { featureFlags } from '@/constants/feature-flags';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import { normalizeTravelPlan, normalizeTravelPlans } from '@/features/travel/normalize';
import type { TravelPlan } from '@/features/travel/types';

interface TravelState {
  plans: TravelPlan[];
  savePlan: (plan: TravelPlan) => void;
  removePlan: (id: string) => void;
  replacePlans: (plans: TravelPlan[]) => void;
  reset: () => void;
}

export const useTravel = create<TravelState>()(
  persist(
    (set) => ({
      plans: withAllAccountsTestTrip([]),
      savePlan: (plan) =>
        set((state) => {
          const normalized = normalizeTravelPlan(plan);
          if (!normalized) return state;
          return {
            plans: [
              ...state.plans.filter((item) => item.id !== normalized.id),
              normalized,
            ],
          };
        }),
      removePlan: (id) =>
        set((state) => ({
          plans:
            id === ALL_ACCOUNTS_TEST_TRIP.id &&
            featureFlags.allAccountsTestTrip
              ? state.plans
              : state.plans.filter((item) => item.id !== id),
        })),
      replacePlans: (plans) =>
        set({ plans: withAllAccountsTestTrip(normalizeTravelPlans(plans)) }),
      reset: () => set({ plans: withAllAccountsTestTrip([]) }),
    }),
    {
      name: STORAGE_KEYS.travel,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TravelState>;
        return {
          ...currentState,
          ...persisted,
          plans: withAllAccountsTestTrip(normalizeTravelPlans(persisted.plans)),
        };
      },
    },
  ),
);
