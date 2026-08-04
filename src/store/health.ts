import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_EMOTIONS } from '@/features/health/defaults';
import type {
  DailyHealthSummary,
  EmotionDefinition,
  HealthImport,
  HealthWorkoutSummary,
  MoodEntry,
  MoodFactor,
  MoodFactorCategory,
  MoodPlaybook,
  MoodPlaybookRun,
} from '@/features/health/types';
import { createSensitivePersistStorage, STORAGE_KEYS } from '@/services/storage';
import { newId } from '@/utils/id';

interface HealthState {
  version: 1;
  accessReviewed: boolean;
  stateOfMindSyncEnabled: boolean;
  aiDisclosureAccepted: boolean;
  dailySummaries: DailyHealthSummary[];
  workouts: HealthWorkoutSummary[];
  lastRefreshAt?: string;
  emotions: EmotionDefinition[];
  factors: MoodFactor[];
  moodEntries: MoodEntry[];
  playbooks: MoodPlaybook[];
  playbookRuns: MoodPlaybookRun[];
  markAccessReviewed: () => void;
  setStateOfMindSyncEnabled: (enabled: boolean) => void;
  acceptAiDisclosure: () => void;
  replaceHealthImport: (value: HealthImport) => void;
  addCustomEmotion: (name: string, valence?: EmotionDefinition['valence']) => string;
  removeCustomEmotion: (id: string) => void;
  saveFactor: (input: { id?: string; name: string; category: MoodFactorCategory; emotionIds: string[] }) => string;
  removeFactor: (id: string) => void;
  saveMoodEntry: (input: Omit<MoodEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string;
  removeMoodEntry: (id: string) => void;
  savePlaybook: (input: Omit<MoodPlaybook, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string;
  removePlaybook: (id: string) => void;
  startPlaybook: (playbookId: string, initialEntryId?: string) => string;
  completePlaybook: (runId: string) => void;
  cancelPlaybook: (runId: string) => void;
  linkFollowUp: (runId: string, entryId: string) => void;
  reset: () => void;
}

const initialState = () => ({
  version: 1 as const,
  accessReviewed: false,
  stateOfMindSyncEnabled: false,
  aiDisclosureAccepted: false,
  dailySummaries: [] as DailyHealthSummary[],
  workouts: [] as HealthWorkoutSummary[],
  lastRefreshAt: undefined as string | undefined,
  emotions: DEFAULT_EMOTIONS.map((emotion) => ({ ...emotion })),
  factors: [] as MoodFactor[],
  moodEntries: [] as MoodEntry[],
  playbooks: [] as MoodPlaybook[],
  playbookRuns: [] as MoodPlaybookRun[],
});

export const useHealth = create<HealthState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      markAccessReviewed: () => set({ accessReviewed: true }),
      setStateOfMindSyncEnabled: (stateOfMindSyncEnabled) => set({ stateOfMindSyncEnabled }),
      acceptAiDisclosure: () => set({ aiDisclosureAccepted: true }),
      replaceHealthImport: ({ daily, workouts }) =>
        set({
          dailySummaries: daily.slice(-90),
          workouts: [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
          lastRefreshAt: new Date().toISOString(),
        }),
      addCustomEmotion: (name, valence = 0) => {
        const id = newId('emotion');
        set((state) => ({
          emotions: [...state.emotions, { id, name: name.trim(), valence }],
        }));
        return id;
      },
      removeCustomEmotion: (id) =>
        set((state) => ({
          emotions: state.emotions.filter((emotion) => emotion.id !== id || emotion.builtIn),
        })),
      saveFactor: (input) => {
        const now = new Date().toISOString();
        const id = input.id ?? newId('factor');
        const previous = get().factors.find((factor) => factor.id === id);
        const factor: MoodFactor = {
          id,
          name: input.name.trim(),
          category: input.category,
          emotionIds: [...new Set(input.emotionIds)],
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        set((state) => ({ factors: [...state.factors.filter((item) => item.id !== id), factor] }));
        return id;
      },
      removeFactor: (id) =>
        set((state) => ({
          factors: state.factors.filter((factor) => factor.id !== id),
          moodEntries: state.moodEntries.map((entry) => ({
            ...entry,
            factorIds: entry.factorIds.filter((factorId) => factorId !== id),
          })),
        })),
      saveMoodEntry: (input) => {
        const now = new Date().toISOString();
        const id = input.id ?? newId('mood');
        const previous = get().moodEntries.find((entry) => entry.id === id);
        const entry: MoodEntry = {
          ...input,
          id,
          note: input.note?.trim() || undefined,
          factorIds: [...new Set(input.factorIds)],
          emotions: input.emotions.filter((rating) => rating.intensity >= 1 && rating.intensity <= 5),
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        set((state) => ({
          moodEntries: [entry, ...state.moodEntries.filter((item) => item.id !== id)].sort(
            (a, b) => b.occurredAt.localeCompare(a.occurredAt),
          ),
        }));
        return id;
      },
      removeMoodEntry: (id) =>
        set((state) => ({
          moodEntries: state.moodEntries.filter((entry) => entry.id !== id),
          playbookRuns: state.playbookRuns.map((run) => ({
            ...run,
            initialEntryId: run.initialEntryId === id ? undefined : run.initialEntryId,
            followUpEntryId: run.followUpEntryId === id ? undefined : run.followUpEntryId,
          })),
        })),
      savePlaybook: (input) => {
        const now = new Date().toISOString();
        const id = input.id ?? newId('playbook');
        const previous = get().playbooks.find((playbook) => playbook.id === id);
        const playbook: MoodPlaybook = {
          ...input,
          id,
          name: input.name.trim(),
          steps: input.steps.map((step) => step.trim()).filter(Boolean),
          sourceEmotionIds: [...new Set(input.sourceEmotionIds)],
          targetEmotionIds: [...new Set(input.targetEmotionIds)],
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        set((state) => ({ playbooks: [...state.playbooks.filter((item) => item.id !== id), playbook] }));
        return id;
      },
      removePlaybook: (id) =>
        set((state) => ({
          playbooks: state.playbooks.filter((playbook) => playbook.id !== id),
          playbookRuns: state.playbookRuns.filter((run) => run.playbookId !== id),
        })),
      startPlaybook: (playbookId, initialEntryId) => {
        const id = newId('playbook-run');
        set((state) => ({
          playbookRuns: [
            { id, playbookId, initialEntryId, startedAt: new Date().toISOString(), status: 'active' },
            ...state.playbookRuns,
          ],
        }));
        return id;
      },
      completePlaybook: (id) =>
        set((state) => ({
          playbookRuns: state.playbookRuns.map((run) =>
            run.id === id
              ? { ...run, status: 'completed', completedAt: new Date().toISOString() }
              : run,
          ),
        })),
      cancelPlaybook: (id) =>
        set((state) => ({
          playbookRuns: state.playbookRuns.map((run) =>
            run.id === id ? { ...run, status: 'cancelled' } : run,
          ),
        })),
      linkFollowUp: (id, entryId) =>
        set((state) => ({
          playbookRuns: state.playbookRuns.map((run) =>
            run.id === id ? { ...run, followUpEntryId: entryId } : run,
          ),
        })),
      reset: () => set(initialState()),
    }),
    {
      name: STORAGE_KEYS.health,
      storage: createSensitivePersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<HealthState>;
        const customEmotions = (persisted.emotions ?? []).filter((emotion) => !emotion.builtIn);
        return {
          ...currentState,
          ...persisted,
          version: 1,
          emotions: [...DEFAULT_EMOTIONS.map((emotion) => ({ ...emotion })), ...customEmotions],
        };
      },
    },
  ),
);
