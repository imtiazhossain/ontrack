import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clampCanvasFrame } from '@/features/vision-board/canvas';
import { createDefaultVisionBoardCategories } from '@/features/vision-board/defaults';
import {
  createSampleVisionBoardItems,
  upgradeVisionBoardSample,
  VISION_BOARD_SAMPLE_VERSION,
} from '@/features/vision-board/sample';
import type {
  CanvasFrame,
  VisionBoardCategory,
  VisionBoardItem,
  VisionBoardItemPatch,
  VisionBoardSnapshot,
} from '@/features/vision-board/types';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';

interface CategoryHistory {
  past: VisionBoardSnapshot[];
  future: VisionBoardSnapshot[];
}

export interface VisionBoardState {
  categories: VisionBoardCategory[];
  items: VisionBoardItem[];
  sampleVersion: number;
  updatedAt: string;
  history: Record<string, CategoryHistory>;
  addCategory: (category: VisionBoardCategory) => void;
  updateCategory: (
    id: string,
    patch: Partial<Omit<VisionBoardCategory, 'id' | 'createdAt'>>,
    recordHistory?: boolean,
  ) => void;
  reorderCategories: (orderedIds: string[]) => void;
  removeCategory: (id: string) => void;
  addItem: (item: VisionBoardItem) => void;
  updateItem: (
    id: string,
    patch: VisionBoardItemPatch,
  ) => void;
  updateItemFrame: (id: string, frame: CanvasFrame) => void;
  moveItemLayer: (id: string, direction: 'forward' | 'back') => void;
  removeItem: (id: string) => void;
  undoCategory: (categoryId: string) => void;
  redoCategory: (categoryId: string) => void;
  clearCategoryHistory: (categoryId: string) => void;
  replaceVisionBoardData: (
    categories: VisionBoardCategory[],
    items: VisionBoardItem[],
    updatedAt?: string,
    sampleVersion?: number,
  ) => void;
  reset: () => void;
}

const HISTORY_LIMIT = 50;

function timestamp() {
  return new Date().toISOString();
}

function initialVisionBoardData(at = timestamp()) {
  return {
    categories: createDefaultVisionBoardCategories(at),
    items: createSampleVisionBoardItems(at),
    sampleVersion: VISION_BOARD_SAMPLE_VERSION,
    updatedAt: at,
  };
}

function snapshot(state: VisionBoardState, categoryId: string): VisionBoardSnapshot | undefined {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) return undefined;
  return {
    category: { ...category },
    items: state.items
      .filter((item) => item.categoryId === categoryId)
      .map((item) => ({ ...item, frame: { ...item.frame } })),
  };
}

function withCheckpoint(
  state: VisionBoardState,
  categoryId: string,
): VisionBoardState['history'] {
  const current = snapshot(state, categoryId);
  if (!current) return state.history;
  const existing = state.history[categoryId] ?? { past: [], future: [] };
  return {
    ...state.history,
    [categoryId]: {
      past: [...existing.past, current].slice(-HISTORY_LIMIT),
      future: [],
    },
  };
}

function restoreSnapshot(
  state: VisionBoardState,
  categoryId: string,
  next: VisionBoardSnapshot,
) {
  return {
    categories: state.categories.map((category) =>
      category.id === categoryId ? next.category : category,
    ),
    items: [
      ...state.items.filter((item) => item.categoryId !== categoryId),
      ...next.items,
    ],
  };
}

export const useVisionBoard = create<VisionBoardState>()(
  persist(
    (set) => ({
      ...initialVisionBoardData(),
      history: {},
      addCategory: (category) =>
        set((state) => ({
          categories: [...state.categories, category],
          updatedAt: timestamp(),
        })),
      updateCategory: (id, patch, recordHistory = true) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id
              ? { ...category, ...patch, updatedAt: timestamp() }
              : category,
          ),
          history: recordHistory ? withCheckpoint(state, id) : state.history,
          updatedAt: timestamp(),
        })),
      reorderCategories: (orderedIds) =>
        set((state) => {
          const positions = new Map(orderedIds.map((id, index) => [id, index]));
          return {
            categories: state.categories.map((category) => ({
              ...category,
              order: positions.get(category.id) ?? category.order,
              updatedAt: timestamp(),
            })),
            updatedAt: timestamp(),
          };
        }),
      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          items: state.items.filter((item) => item.categoryId !== id),
          history: Object.fromEntries(
            Object.entries(state.history).filter(([categoryId]) => categoryId !== id),
          ),
          updatedAt: timestamp(),
        })),
      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, frame: clampCanvasFrame(item.frame) }],
          history: withCheckpoint(state, item.categoryId),
          updatedAt: timestamp(),
        })),
      updateItem: (id, patch) =>
        set((state) => {
          const current = state.items.find((item) => item.id === id);
          if (!current) return state;
          return {
            items: state.items.map((item) =>
              item.id === id
                ? ({
                    ...item,
                    ...patch,
                    frame: patch.frame ? clampCanvasFrame(patch.frame) : item.frame,
                    updatedAt: timestamp(),
                  } as VisionBoardItem)
                : item,
            ),
            history: withCheckpoint(state, current.categoryId),
            updatedAt: timestamp(),
          };
        }),
      updateItemFrame: (id, frame) =>
        set((state) => {
          const current = state.items.find((item) => item.id === id);
          if (!current) return state;
          const nextFrame = clampCanvasFrame(frame);
          if (
            current.frame.x === nextFrame.x &&
            current.frame.y === nextFrame.y &&
            current.frame.width === nextFrame.width &&
            current.frame.height === nextFrame.height &&
            current.frame.rotation === nextFrame.rotation &&
            current.frame.zIndex === nextFrame.zIndex
          ) {
            return state;
          }
          return {
            items: state.items.map((item) =>
              item.id === id
                ? { ...item, frame: nextFrame, updatedAt: timestamp() }
                : item,
            ),
            history: withCheckpoint(state, current.categoryId),
            updatedAt: timestamp(),
          };
        }),
      moveItemLayer: (id, direction) =>
        set((state) => {
          const current = state.items.find((item) => item.id === id);
          if (!current) return state;
          const categoryItems = state.items
            .filter((item) => item.categoryId === current.categoryId)
            .sort((a, b) => a.frame.zIndex - b.frame.zIndex);
          const index = categoryItems.findIndex((item) => item.id === id);
          const targetIndex = direction === 'forward' ? index + 1 : index - 1;
          const target = categoryItems[targetIndex];
          if (!target) return state;
          return {
            items: state.items.map((item) => {
              if (item.id === current.id) {
                return {
                  ...item,
                  frame: { ...item.frame, zIndex: target.frame.zIndex },
                  updatedAt: timestamp(),
                };
              }
              if (item.id === target.id) {
                return {
                  ...item,
                  frame: { ...item.frame, zIndex: current.frame.zIndex },
                  updatedAt: timestamp(),
                };
              }
              return item;
            }),
            history: withCheckpoint(state, current.categoryId),
            updatedAt: timestamp(),
          };
        }),
      removeItem: (id) =>
        set((state) => {
          const current = state.items.find((item) => item.id === id);
          if (!current) return state;
          return {
            items: state.items.filter((item) => item.id !== id),
            history: withCheckpoint(state, current.categoryId),
            updatedAt: timestamp(),
          };
        }),
      undoCategory: (categoryId) =>
        set((state) => {
          const entry = state.history[categoryId];
          const previous = entry?.past.at(-1);
          const current = snapshot(state, categoryId);
          if (!entry || !previous || !current) return state;
          const restored = restoreSnapshot(state, categoryId, previous);
          return {
            ...restored,
            history: {
              ...state.history,
              [categoryId]: {
                past: entry.past.slice(0, -1),
                future: [current, ...entry.future].slice(0, HISTORY_LIMIT),
              },
            },
            updatedAt: timestamp(),
          };
        }),
      redoCategory: (categoryId) =>
        set((state) => {
          const entry = state.history[categoryId];
          const next = entry?.future[0];
          const current = snapshot(state, categoryId);
          if (!entry || !next || !current) return state;
          const restored = restoreSnapshot(state, categoryId, next);
          return {
            ...restored,
            history: {
              ...state.history,
              [categoryId]: {
                past: [...entry.past, current].slice(-HISTORY_LIMIT),
                future: entry.future.slice(1),
              },
            },
            updatedAt: timestamp(),
          };
        }),
      clearCategoryHistory: (categoryId) =>
        set((state) => ({
          history: Object.fromEntries(
            Object.entries(state.history).filter(([id]) => id !== categoryId),
          ),
        })),
      replaceVisionBoardData: (
        categories,
        items,
        updatedAt = timestamp(),
        sampleVersion = 0,
      ) => {
        const upgraded = upgradeVisionBoardSample(
          categories,
          items,
          sampleVersion,
          updatedAt,
        );
        set({
          categories,
          items: upgraded.items.map((item) => ({
            ...item,
            frame: clampCanvasFrame(item.frame),
          })),
          sampleVersion: upgraded.sampleVersion,
          history: {},
          updatedAt,
        });
      },
      reset: () =>
        set({
          ...initialVisionBoardData(),
          history: {},
        }),
    }),
    {
      name: STORAGE_KEYS.visionBoard,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<VisionBoardState>;
        const categories = persisted.categories ?? currentState.categories;
        const upgraded = upgradeVisionBoardSample(
          categories,
          persisted.items ?? [],
          persisted.sampleVersion ?? 0,
          persisted.updatedAt ?? currentState.updatedAt,
        );
        return {
          ...currentState,
          ...persisted,
          categories,
          items: upgraded.items.map((item) => ({
            ...item,
            frame: clampCanvasFrame(item.frame),
          })),
          sampleVersion: upgraded.sampleVersion,
          history: {},
        };
      },
      partialize: (state) =>
        ({
          categories: state.categories,
          items: state.items,
          sampleVersion: state.sampleVersion,
          updatedAt: state.updatedAt,
        }) as VisionBoardState,
    },
  ),
);

export function newVisionBoardId(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
