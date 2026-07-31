import { persist } from 'zustand/middleware';
import { createWithEqualityFn as create } from 'zustand/traditional';

import {
  createSamplePlant,
  ensurePlantSample,
  isSamplePlant,
  PLANT_SAMPLE_VERSION,
} from '@/features/plants/sample';
import { defaultSoilRecommendation } from '@/services/plants/soil';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import type { Plant, PlantCarePlan, PlantCheckIn, WateringLog } from '@/types/models';

interface PlantState {
  plants: Plant[];
  sampleVersion: number;
  sampleDismissed: boolean;
  addPlant: (plant: Plant) => void;
  updatePlant: (id: string, patch: Partial<Omit<Plant, 'id' | 'createdAt'>>) => void;
  removePlant: (id: string) => void;
  addWateringLog: (plantId: string, log: WateringLog) => void;
  removeWateringLog: (plantId: string, logId: string) => void;
  addCheckIn: (plantId: string, checkIn: PlantCheckIn) => void;
  acceptCheckInPlan: (plantId: string, checkInId: string, plan: PlantCarePlan) => void;
  reset: () => void;
}

function normalizePlant(plant: Plant): Plant {
  return {
    ...plant,
    identity: {
      ...plant.identity,
      // Saving a plant in older builds was the user's implicit confirmation.
      identificationSource: plant.identity.identificationSource ?? 'user-confirmed',
    },
    carePlan: {
      ...plant.carePlan,
      soil: plant.carePlan.soil ?? defaultSoilRecommendation(),
    },
    wateringLogs: plant.wateringLogs ?? [],
    checkIns: plant.checkIns ?? [],
  };
}

function initialPlantData(timestamp = new Date().toISOString()) {
  return {
    plants: [createSamplePlant(timestamp)],
    sampleVersion: PLANT_SAMPLE_VERSION,
    sampleDismissed: false,
  };
}

export const usePlants = create<PlantState>()(
  persist(
    (set) => ({
      ...initialPlantData(),
      addPlant: (plant) => set((state) => ({ plants: [...state.plants, plant] })),
      updatePlant: (id, patch) => set((state) => ({
        plants: state.plants.map((plant) => plant.id === id
          ? { ...plant, ...patch, updatedAt: new Date().toISOString() }
          : plant),
      })),
      removePlant: (id) => set((state) => ({
        plants: state.plants.filter((plant) => plant.id !== id),
        sampleDismissed: state.plants.some((plant) => plant.id === id && isSamplePlant(plant))
          ? true
          : state.sampleDismissed,
      })),
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
      reset: () => set(initialPlantData()),
    }),
    {
      name: STORAGE_KEYS.plants,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PlantState>;
        const normalized = (persisted.plants ?? []).map(normalizePlant);
        const upgraded = ensurePlantSample(
          normalized,
          persisted.sampleVersion ?? 0,
          persisted.sampleDismissed ?? false,
        );
        return {
          ...currentState,
          ...persisted,
          plants: upgraded.plants,
          sampleVersion: upgraded.sampleVersion,
          sampleDismissed: upgraded.sampleDismissed,
        };
      },
      partialize: (state) =>
        ({
          plants: state.plants,
          sampleVersion: state.sampleVersion,
          sampleDismissed: state.sampleDismissed,
        }) as PlantState,
    },
  ),
);
