import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import type { Plant, PlantCarePlan, PlantCheckIn, WateringLog } from '@/types/models';

interface PlantState {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  updatePlant: (id: string, patch: Partial<Omit<Plant, 'id' | 'createdAt'>>) => void;
  removePlant: (id: string) => void;
  addWateringLog: (plantId: string, log: WateringLog) => void;
  removeWateringLog: (plantId: string, logId: string) => void;
  addCheckIn: (plantId: string, checkIn: PlantCheckIn) => void;
  acceptCheckInPlan: (plantId: string, checkInId: string, plan: PlantCarePlan) => void;
  reset: () => void;
}

export const usePlants = create<PlantState>()(
  persist(
    (set) => ({
      plants: [],
      addPlant: (plant) => set((state) => ({ plants: [...state.plants, plant] })),
      updatePlant: (id, patch) => set((state) => ({
        plants: state.plants.map((plant) => plant.id === id
          ? { ...plant, ...patch, updatedAt: new Date().toISOString() }
          : plant),
      })),
      removePlant: (id) => set((state) => ({ plants: state.plants.filter((plant) => plant.id !== id) })),
      addWateringLog: (plantId, log) => set((state) => ({
        plants: state.plants.map((plant) => plant.id === plantId
          ? { ...plant, wateringLogs: [...plant.wateringLogs, log], updatedAt: new Date().toISOString() }
          : plant),
      })),
      removeWateringLog: (plantId, logId) => set((state) => ({
        plants: state.plants.map((plant) => plant.id === plantId
          ? { ...plant, wateringLogs: plant.wateringLogs.filter((log) => log.id !== logId), updatedAt: new Date().toISOString() }
          : plant),
      })),
      addCheckIn: (plantId, checkIn) => set((state) => ({
        plants: state.plants.map((plant) => plant.id === plantId
          ? {
              ...plant,
              health: checkIn.assessment,
              checkIns: [...plant.checkIns, checkIn],
              updatedAt: new Date().toISOString(),
            }
          : plant),
      })),
      acceptCheckInPlan: (plantId, checkInId, carePlan) => set((state) => ({
        plants: state.plants.map((plant) => plant.id === plantId
          ? {
              ...plant,
              carePlan,
              checkIns: plant.checkIns.map((checkIn) => checkIn.id === checkInId
                ? { ...checkIn, carePlanAcceptedAt: new Date().toISOString() }
                : checkIn),
              updatedAt: new Date().toISOString(),
            }
          : plant),
      })),
      reset: () => set({ plants: [] }),
    }),
    {
      name: STORAGE_KEYS.plants,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PlantState>;
        return {
          ...currentState,
          ...persisted,
          plants: (persisted.plants ?? []).map((plant) => ({
            ...plant,
            identity: {
              ...plant.identity,
              // Saving a plant in older builds was the user's implicit confirmation.
              identificationSource: plant.identity.identificationSource ?? 'user-confirmed',
            },
            wateringLogs: plant.wateringLogs ?? [],
            checkIns: plant.checkIns ?? [],
          })),
        };
      },
    },
  ),
);
