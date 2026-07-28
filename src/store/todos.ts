import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isGuestDirtyTrackingSuppressed } from '@/features/auth/guest-dirty-tracking';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import { useAuthAccess } from '@/store/auth-access';

export interface TodoTask {
  id: string;
  title: string;
  completed: boolean;
  important: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface TodoState {
  tasks: TodoTask[];
  addTask: (title: string) => TodoTask | undefined;
  updateTask: (id: string, title: string) => void;
  toggleTask: (id: string) => void;
  toggleImportant: (id: string) => void;
  deleteTask: (id: string) => void;
  clearCompleted: () => void;
  reset: () => void;
}

let idCounter = 0;

function newTodoId() {
  idCounter += 1;
  return `todo-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

function markGuestEdit() {
  if (!isGuestDirtyTrackingSuppressed()) {
    useAuthAccess.getState().markGuestDataDirty();
  }
}

export function normalizeTodoTasks(value: unknown): TodoTask[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const task = candidate as Partial<TodoTask>;
    const title = typeof task.title === 'string' ? task.title.trim() : '';
    if (!title || typeof task.id !== 'string') return [];

    const createdAt =
      typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString();
    const updatedAt = typeof task.updatedAt === 'string' ? task.updatedAt : createdAt;
    const completed = task.completed === true;

    return [{
      id: task.id,
      title,
      completed,
      important: task.important === true,
      createdAt,
      updatedAt,
      completedAt:
        completed && typeof task.completedAt === 'string' ? task.completedAt : undefined,
    }];
  });
}

export const useTodos = create<TodoState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (title) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return undefined;
        const now = new Date().toISOString();
        const task: TodoTask = {
          id: newTodoId(),
          title: cleanTitle,
          completed: false,
          important: false,
          createdAt: now,
          updatedAt: now,
        };
        markGuestEdit();
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return task;
      },

      updateTask: (id, title) => {
        const cleanTitle = title.trim();
        if (!cleanTitle || !get().tasks.some((task) => task.id === id)) return;
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, title: cleanTitle, updatedAt: new Date().toISOString() }
              : task,
          ),
        }));
      },

      toggleTask: (id) => {
        if (!get().tasks.some((task) => task.id === id)) return;
        const now = new Date().toISOString();
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed: !task.completed,
                  completedAt: task.completed ? undefined : now,
                  updatedAt: now,
                }
              : task,
          ),
        }));
      },

      toggleImportant: (id) => {
        if (!get().tasks.some((task) => task.id === id)) return;
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  important: !task.important,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        }));
      },

      deleteTask: (id) => {
        if (!get().tasks.some((task) => task.id === id)) return;
        markGuestEdit();
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      },

      clearCompleted: () => {
        if (!get().tasks.some((task) => task.completed)) return;
        markGuestEdit();
        set((state) => ({ tasks: state.tasks.filter((task) => !task.completed) }));
      },

      reset: () => set({ tasks: [] }),
    }),
    {
      name: STORAGE_KEYS.todos,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<TodoState>;
        return {
          ...currentState,
          ...persisted,
          tasks: normalizeTodoTasks(persisted.tasks),
        };
      },
    },
  ),
);
