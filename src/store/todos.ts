import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isGuestDirtyTrackingSuppressed } from '@/features/auth/guest-dirty-tracking';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import { useAuthAccess } from '@/store/auth-access';

export type TodoListMode = 'private' | 'shared';
export type TodoListRole = 'owner' | 'member';

export interface TodoList {
  id: string;
  name: string;
  mode: TodoListMode;
  role: TodoListRole;
  ownerUserId?: string;
  ownerName?: string;
  shareCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoTask {
  id: string;
  listId: string;
  title: string;
  completed: boolean;
  important: boolean;
  assigneeUserId?: string;
  completedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  version: number;
}

export interface TodoMember {
  listId: string;
  userId: string;
  displayName: string;
  role: TodoListRole;
  joinedAt: string;
}

export interface TodoInvite {
  id: string;
  listId: string;
  listName: string;
  inviterName: string;
  inviteeEmail: string;
  code: string;
  createdAt: string;
}

export type TodoMutationOperation =
  | 'rename_list'
  | 'add_task'
  | 'update_task'
  | 'delete_task'
  | 'set_completion'
  | 'set_assignee'
  | 'clear_completed';

export interface PendingTodoMutation {
  id: string;
  listId: string;
  operation: TodoMutationOperation;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

export interface TodoPersistedState {
  lists: TodoList[];
  tasks: TodoTask[];
  members: TodoMember[];
  invites: TodoInvite[];
  pendingMutations: PendingTodoMutation[];
}

interface TodoState extends TodoPersistedState {
  syncError?: string;
  createList: (name: string) => TodoList | undefined;
  reorderLists: (orderedIds: string[]) => void;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  addTask: (listId: string, title?: string) => TodoTask | undefined;
  updateTask: (id: string, title: string) => void;
  setTaskCompletion: (id: string, completed: boolean, actorUserId?: string) => void;
  toggleTask: (id: string, actorUserId?: string) => void;
  toggleImportant: (id: string) => void;
  setAssignee: (id: string, assigneeUserId?: string) => void;
  deleteTask: (id: string) => void;
  clearCompleted: (listId?: string) => void;
  replacePrivateData: (value: unknown) => void;
  replaceSharedSnapshot: (snapshot: TodoSharedSnapshot) => void;
  removeSharedList: (listId: string) => void;
  setShareCode: (listId: string, code?: string) => void;
  replaceInvites: (invites: TodoInvite[]) => void;
  markMutationAttempt: (id: string) => void;
  acknowledgeMutation: (id: string) => void;
  rejectMutation: (id: string, message: string) => void;
  clearSyncError: () => void;
  reset: () => void;
}

export interface TodoSharedSnapshot {
  list: TodoList;
  tasks: TodoTask[];
  members: TodoMember[];
}

let fallbackIdCounter = 0;
const generatedIds = new Set<string>();

function newId() {
  const candidate = Crypto.randomUUID?.();
  if (
    typeof candidate === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(candidate) &&
    !generatedIds.has(candidate)
  ) {
    generatedIds.add(candidate);
    return candidate;
  }
  fallbackIdCounter += 1;
  const suffix = `${Date.now().toString(16).slice(-10)}${fallbackIdCounter
    .toString(16)
    .padStart(2, '0')}`.slice(-12);
  const fallback = `00000000-0000-4000-8000-${suffix}`;
  generatedIds.add(fallback);
  return fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function cleanTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 160);
}

function markGuestEdit() {
  if (!isGuestDirtyTrackingSuppressed()) {
    useAuthAccess.getState().markGuestDataDirty();
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function normalizeList(value: unknown): TodoList | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<TodoList>;
  const id = stringValue(candidate.id);
  const name = typeof candidate.name === 'string' ? cleanName(candidate.name) : '';
  if (!id || !name) return undefined;
  const createdAt = stringValue(candidate.createdAt) ?? nowIso();
  return {
    id,
    name,
    mode: candidate.mode === 'shared' ? 'shared' : 'private',
    role: candidate.role === 'member' ? 'member' : 'owner',
    ownerUserId: stringValue(candidate.ownerUserId),
    ownerName: stringValue(candidate.ownerName),
    shareCode: stringValue(candidate.shareCode),
    createdAt,
    updatedAt: stringValue(candidate.updatedAt) ?? createdAt,
  };
}

function normalizeTask(value: unknown, fallbackListId?: string): TodoTask | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<TodoTask>;
  const title = typeof candidate.title === 'string' ? cleanTitle(candidate.title) : '';
  const listId = stringValue(candidate.listId) ?? fallbackListId;
  if (!title || !listId) return undefined;
  const createdAt = stringValue(candidate.createdAt) ?? nowIso();
  const completed = candidate.completed === true;
  return {
    id: stringValue(candidate.id) ?? newId(),
    listId,
    title,
    completed,
    important: candidate.important === true,
    assigneeUserId: stringValue(candidate.assigneeUserId),
    completedByUserId: completed ? stringValue(candidate.completedByUserId) : undefined,
    createdAt,
    updatedAt: stringValue(candidate.updatedAt) ?? createdAt,
    completedAt: completed ? stringValue(candidate.completedAt) : undefined,
    version:
      typeof candidate.version === 'number' && Number.isFinite(candidate.version)
        ? Math.max(0, Math.floor(candidate.version))
        : 0,
  };
}

function normalizeMember(value: unknown): TodoMember | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<TodoMember>;
  const listId = stringValue(candidate.listId);
  const userId = stringValue(candidate.userId);
  const displayName = stringValue(candidate.displayName);
  if (!listId || !userId || !displayName) return undefined;
  return {
    listId,
    userId,
    displayName,
    role: candidate.role === 'owner' ? 'owner' : 'member',
    joinedAt: stringValue(candidate.joinedAt) ?? nowIso(),
  };
}

function normalizeInvite(value: unknown): TodoInvite | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<TodoInvite>;
  const id = stringValue(candidate.id);
  const listId = stringValue(candidate.listId);
  const listName = stringValue(candidate.listName);
  const inviterName = stringValue(candidate.inviterName);
  const inviteeEmail = stringValue(candidate.inviteeEmail);
  const code = stringValue(candidate.code);
  if (!id || !listId || !listName || !inviterName || !inviteeEmail || !code) {
    return undefined;
  }
  return {
    id,
    listId,
    listName,
    inviterName,
    inviteeEmail: inviteeEmail.toLowerCase(),
    code,
    createdAt: stringValue(candidate.createdAt) ?? nowIso(),
  };
}

function normalizeMutation(value: unknown): PendingTodoMutation | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<PendingTodoMutation>;
  const id = stringValue(candidate.id);
  const listId = stringValue(candidate.listId);
  const operations: TodoMutationOperation[] = [
    'rename_list',
    'add_task',
    'update_task',
    'delete_task',
    'set_completion',
    'set_assignee',
    'clear_completed',
  ];
  if (
    !id ||
    !listId ||
    !candidate.operation ||
    !operations.includes(candidate.operation) ||
    !candidate.payload ||
    typeof candidate.payload !== 'object' ||
    Array.isArray(candidate.payload)
  ) {
    return undefined;
  }
  return {
    id,
    listId,
    operation: candidate.operation,
    payload: candidate.payload,
    createdAt: stringValue(candidate.createdAt) ?? nowIso(),
    attempts:
      typeof candidate.attempts === 'number'
        ? Math.max(0, Math.floor(candidate.attempts))
        : 0,
  };
}

export function normalizeTodoState(value: unknown): TodoPersistedState {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<TodoPersistedState>)
      : {};
  let lists = Array.isArray(source.lists)
    ? source.lists.flatMap((item) => {
        const list = normalizeList(item);
        return list ? [list] : [];
      })
    : [];

  const rawTasks = Array.isArray(source.tasks) ? source.tasks : [];
  const legacyTasks =
    rawTasks.length > 0 &&
    rawTasks.some(
      (item) => item && typeof item === 'object' && !stringValue((item as Partial<TodoTask>).listId),
    );
  let fallbackListId: string | undefined;
  if (legacyTasks) {
    const timestamps = rawTasks.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const createdAt = stringValue((item as Partial<TodoTask>).createdAt);
      return createdAt ? [createdAt] : [];
    });
    const createdAt = timestamps.sort()[0] ?? nowIso();
    fallbackListId = newId();
    lists = [
      {
        id: fallbackListId,
        name: 'To Do',
        mode: 'private',
        role: 'owner',
        createdAt,
        updatedAt: nowIso(),
      },
      ...lists,
    ];
  }

  const listIds = new Set(lists.map((list) => list.id));
  let tasks = rawTasks.length > 0
    ? rawTasks.flatMap((item) => {
        const task = normalizeTask(item, fallbackListId);
        if (!task || !listIds.has(task.listId)) return [];
        return [{ ...task, id: legacyTasks ? newId() : task.id }];
      })
    : [];

  if (lists.length === 0 && tasks.length === 0) {
    const createdAt = nowIso();
    const list: TodoList = {
      id: newId(),
      name: 'To Do',
      mode: 'private',
      role: 'owner',
      createdAt,
      updatedAt: createdAt,
    };
    lists = [list];
  }

  const dedupedLists = new Map(lists.map((list) => [list.id, list]));
  const validListIds = new Set(dedupedLists.keys());
  tasks = tasks.filter((task) => validListIds.has(task.listId));

  return {
    lists: [...dedupedLists.values()],
    tasks: [...new Map(tasks.map((task) => [task.id, task])).values()],
    members: Array.isArray(source.members)
      ? source.members.flatMap((item) => {
          const member = normalizeMember(item);
          return member && validListIds.has(member.listId) ? [member] : [];
        })
      : [],
    invites: Array.isArray(source.invites)
      ? source.invites.flatMap((item) => {
          const invite = normalizeInvite(item);
          return invite ? [invite] : [];
        })
      : [],
    pendingMutations: Array.isArray(source.pendingMutations)
      ? source.pendingMutations.flatMap((item) => {
          const mutation = normalizeMutation(item);
          return mutation && validListIds.has(mutation.listId) ? [mutation] : [];
        })
      : [],
  };
}

export function normalizeTodoTasks(value: unknown): TodoTask[] {
  return normalizeTodoState({ tasks: value }).tasks;
}

export function privateTodoPayload(state: TodoPersistedState) {
  const privateListIds = new Set(
    state.lists.filter((list) => list.mode === 'private').map((list) => list.id),
  );
  return {
    lists: state.lists.filter((list) => privateListIds.has(list.id)),
    tasks: state.tasks.filter((task) => privateListIds.has(task.listId)),
  };
}

export function canCompleteTodo(
  list: TodoList,
  task: TodoTask,
  actorUserId?: string,
): boolean {
  if (list.role === 'owner' || list.mode === 'private') return true;
  return Boolean(actorUserId && (!task.assigneeUserId || task.assigneeUserId === actorUserId));
}

function queuedMutation(
  list: TodoList | undefined,
  operation: TodoMutationOperation,
  payload: Record<string, unknown>,
): PendingTodoMutation[] {
  if (!list || list.mode !== 'shared') return [];
  return [{
    id: newId(),
    listId: list.id,
    operation,
    payload,
    createdAt: nowIso(),
    attempts: 0,
  }];
}

const initialState = normalizeTodoState(undefined);

export const useTodos = create<TodoState>()(
  persist(
    (set, get) => ({
      ...initialState,
      syncError: undefined,

      createList: (name) => {
        const clean = cleanName(name);
        if (!clean) return undefined;
        const now = nowIso();
        const list: TodoList = {
          id: newId(),
          name: clean,
          mode: 'private',
          role: 'owner',
          createdAt: now,
          updatedAt: now,
        };
        markGuestEdit();
        set((state) => ({ lists: [list, ...state.lists] }));
        return list;
      },

      reorderLists: (orderedIds) => {
        const listsById = new Map(get().lists.map((list) => [list.id, list]));
        const seen = new Set<string>();
        const reordered = orderedIds.flatMap((id) => {
          const list = listsById.get(id);
          if (!list || seen.has(id)) return [];
          seen.add(id);
          return [list];
        });
        const unchanged = get().lists.filter((list) => !seen.has(list.id));
        if (reordered.length === 0) return;
        markGuestEdit();
        set({ lists: [...reordered, ...unchanged] });
      },

      renameList: (id, name) => {
        const clean = cleanName(name);
        const list = get().lists.find((item) => item.id === id);
        if (!clean || !list || list.role !== 'owner') return;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          lists: state.lists.map((item) =>
            item.id === id ? { ...item, name: clean, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'rename_list', { name: clean }),
          ],
        }));
      },

      deleteList: (id) => {
        const list = get().lists.find((item) => item.id === id);
        if (!list || list.role !== 'owner' || list.mode === 'shared') return;
        markGuestEdit();
        set((state) => ({
          lists: state.lists.filter((item) => item.id !== id),
          tasks: state.tasks.filter((task) => task.listId !== id),
          members: state.members.filter((member) => member.listId !== id),
        }));
      },

      addTask: (listId, maybeTitle) => {
        const legacyCall = maybeTitle === undefined;
        const list = legacyCall ? get().lists[0] : get().lists.find((item) => item.id === listId);
        const clean = cleanTitle(legacyCall ? listId : maybeTitle);
        if (!list || list.role !== 'owner' || !clean) return undefined;
        const now = nowIso();
        const task: TodoTask = {
          id: newId(),
          listId: list.id,
          title: clean,
          completed: false,
          important: false,
          createdAt: now,
          updatedAt: now,
          version: 0,
        };
        markGuestEdit();
        set((state) => ({
          tasks: [task, ...state.tasks],
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt: now } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'add_task', { task }),
          ],
        }));
        return task;
      },

      updateTask: (id, title) => {
        const clean = cleanTitle(title);
        const task = get().tasks.find((item) => item.id === id);
        const list = task ? get().lists.find((item) => item.id === task.listId) : undefined;
        if (!clean || !task || !list || list.role !== 'owner') return;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === id ? { ...item, title: clean, updatedAt } : item,
          ),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'update_task', { taskId: id, title: clean }),
          ],
        }));
      },

      setTaskCompletion: (id, completed, actorUserId) => {
        const task = get().tasks.find((item) => item.id === id);
        const list = task ? get().lists.find((item) => item.id === task.listId) : undefined;
        if (!task || !list || !canCompleteTodo(list, task, actorUserId)) return;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === id
              ? {
                  ...item,
                  completed,
                  completedAt: completed ? updatedAt : undefined,
                  completedByUserId: completed ? actorUserId : undefined,
                  updatedAt,
                }
              : item,
          ),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'set_completion', {
              taskId: id,
              completed,
            }),
          ],
        }));
      },

      toggleTask: (id, actorUserId) => {
        const task = get().tasks.find((item) => item.id === id);
        if (task) get().setTaskCompletion(id, !task.completed, actorUserId);
      },

      toggleImportant: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        const list = task ? get().lists.find((item) => item.id === task.listId) : undefined;
        if (!task || !list || list.role !== 'owner') return;
        const important = !task.important;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === id ? { ...item, important, updatedAt } : item,
          ),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'update_task', { taskId: id, important }),
          ],
        }));
      },

      setAssignee: (id, assigneeUserId) => {
        const task = get().tasks.find((item) => item.id === id);
        const list = task ? get().lists.find((item) => item.id === task.listId) : undefined;
        if (!task || !list || list.role !== 'owner') return;
        const updatedAt = nowIso();
        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === id ? { ...item, assigneeUserId, updatedAt } : item,
          ),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'set_assignee', {
              taskId: id,
              assigneeUserId: assigneeUserId ?? null,
            }),
          ],
        }));
      },

      deleteTask: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        const list = task ? get().lists.find((item) => item.id === task.listId) : undefined;
        if (!task || !list || list.role !== 'owner') return;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.filter((item) => item.id !== id),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'delete_task', { taskId: id }),
          ],
        }));
      },

      clearCompleted: (listId) => {
        const list = listId
          ? get().lists.find((item) => item.id === listId)
          : get().lists[0];
        if (!list || list.role !== 'owner') return;
        const completedIds = get().tasks
          .filter((task) => task.listId === list.id && task.completed)
          .map((task) => task.id);
        if (completedIds.length === 0) return;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.filter((task) => !completedIds.includes(task.id)),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'clear_completed', {}),
          ],
        }));
      },

      replacePrivateData: (value) => {
        const incoming = normalizeTodoState(value);
        set((state) => {
          const sharedIds = new Set(
            state.lists.filter((list) => list.mode === 'shared').map((list) => list.id),
          );
          const incomingPrivate = incoming.lists.filter((list) => list.mode === 'private');
          const incomingById = new Map(incomingPrivate.map((list) => [list.id, list]));
          const retainedIds = new Set<string>();
          const lists = state.lists.flatMap((list) => {
            if (list.mode === 'shared') return [list];
            const replacement = incomingById.get(list.id);
            if (!replacement) return [];
            retainedIds.add(list.id);
            return [replacement];
          });
          return {
            lists: [
              ...lists,
              ...incomingPrivate.filter((list) => !retainedIds.has(list.id)),
            ],
            tasks: [
              ...incoming.tasks.filter((task) =>
                incoming.lists.some(
                  (list) => list.id === task.listId && list.mode === 'private',
                ),
              ),
              ...state.tasks.filter((task) => sharedIds.has(task.listId)),
            ],
          };
        });
      },

      replaceSharedSnapshot: (snapshot) => {
        const list = normalizeList({ ...snapshot.list, mode: 'shared' });
        if (!list) return;
        const tasks = snapshot.tasks.flatMap((item) => {
          const task = normalizeTask(item, list.id);
          return task ? [task] : [];
        });
        const members = snapshot.members.flatMap((item) => {
          const member = normalizeMember(item);
          return member ? [member] : [];
        });
        set((state) => {
          const existingIndex = state.lists.findIndex((item) => item.id === list.id);
          const nextList = {
            ...list,
            shareCode:
              list.shareCode ??
              state.lists.find((item) => item.id === list.id)?.shareCode,
          };
          const lists = [...state.lists];
          if (existingIndex >= 0) lists[existingIndex] = nextList;
          else lists.unshift(nextList);
          return {
            lists,
            tasks: [...tasks, ...state.tasks.filter((item) => item.listId !== list.id)],
            members: [
              ...members,
              ...state.members.filter((item) => item.listId !== list.id),
            ],
          };
        });
      },

      removeSharedList: (listId) =>
        set((state) => ({
          lists: state.lists.filter((list) => list.id !== listId),
          tasks: state.tasks.filter((task) => task.listId !== listId),
          members: state.members.filter((member) => member.listId !== listId),
          pendingMutations: state.pendingMutations.filter(
            (mutation) => mutation.listId !== listId,
          ),
        })),

      setShareCode: (listId, shareCode) =>
        set((state) => ({
          lists: state.lists.map((list) =>
            list.id === listId ? { ...list, shareCode } : list,
          ),
        })),

      replaceInvites: (invites) =>
        set({
          invites: invites.flatMap((invite) => {
            const normalized = normalizeInvite(invite);
            return normalized ? [normalized] : [];
          }),
        }),

      markMutationAttempt: (id) =>
        set((state) => ({
          pendingMutations: state.pendingMutations.map((mutation) =>
            mutation.id === id
              ? { ...mutation, attempts: mutation.attempts + 1 }
              : mutation,
          ),
        })),

      acknowledgeMutation: (id) =>
        set((state) => ({
          pendingMutations: state.pendingMutations.filter(
            (mutation) => mutation.id !== id,
          ),
          syncError: undefined,
        })),

      rejectMutation: (id, message) =>
        set((state) => ({
          pendingMutations: state.pendingMutations.filter(
            (mutation) => mutation.id !== id,
          ),
          syncError: message,
        })),

      clearSyncError: () => set({ syncError: undefined }),

      reset: () => set({ ...normalizeTodoState(undefined), syncError: undefined }),
    }),
    {
      name: STORAGE_KEYS.todos,
      storage: createPersistStorage(),
      version: 2,
      migrate: (persistedState) => normalizeTodoState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeTodoState(persistedState),
      }),
      partialize: (state) =>
        ({
          lists: state.lists,
          tasks: state.tasks,
          members: state.members,
          invites: state.invites,
          pendingMutations: state.pendingMutations,
        }) as TodoState,
    },
  ),
);
