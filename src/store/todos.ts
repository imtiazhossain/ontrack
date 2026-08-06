import { persist } from 'zustand/middleware';
import { createWithEqualityFn as create } from 'zustand/traditional';

import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import { newUuid } from '@/utils/id';
import {
    canCompleteTodo,
    markGuestEdit,
    queuedMutation,
} from './todos-helpers';
import {
    cleanName,
    cleanTitle,
    normalizeInvite,
    normalizeList,
    normalizeMember,
    normalizeRecipe,
    normalizeTask,
    normalizeTodoState,
    nowIso,
} from './todos-normalize';
import { createTodoRecipeActions } from './todos-recipe-actions';
import type {
    TodoIngredientInput,
    TodoInvite,
    TodoList,
    TodoListKind,
    TodoPersistedState,
    TodoRecipe,
    TodoRecipeInput,
    TodoSharedSnapshot,
    TodoTask
} from './todos-types';

export {
    canonicalIngredientKey,
    formatIngredientTitle,
    isGroceryListName,
    normalizeTodoState,
    normalizeTodoTasks
} from './todos-normalize';

export {
    canCompleteTodo,
    privateTodoPayload
} from './todos-helpers';

export type {
    PendingTodoMutation,
    TodoIngredientInput,
    TodoInvite,
    TodoList,
    TodoListKind,
    TodoListMode,
    TodoListRole,
    TodoMember,
    TodoMutationOperation,
    TodoPersistedState,
    TodoRecipe,
    TodoRecipeInput,
    TodoRecipeSourceKind,
    TodoSharedSnapshot,
    TodoTask
} from './todos-types';

interface TodoState extends TodoPersistedState {
  syncError?: string;
  createList: (name: string, kind?: TodoListKind) => TodoList | undefined;
  reorderLists: (orderedIds: string[]) => void;
  reorderTasks: (listId: string, orderedIds: string[]) => void;
  reorderRecipes: (listId: string, orderedIds: string[]) => void;
  renameList: (id: string, name: string) => void;
  setListKind: (id: string, kind: TodoListKind) => boolean;
  deleteList: (id: string) => void;
  addTask: (listId: string, title?: string) => TodoTask | undefined;
  addRecipe: (listId: string, input: TodoRecipeInput) => TodoRecipe | undefined;
  updateRecipe: (
    id: string,
    patch: Partial<Pick<TodoRecipe, 'name' | 'sourceUrl' | 'targetServings'>>,
  ) => void;
  deleteRecipe: (id: string) => void;
  updateIngredient: (id: string, patch: Partial<TodoIngredientInput>) => void;
  updateTask: (id: string, title: string) => void;
  setTaskCompletion: (id: string, completed: boolean, actorUserId?: string) => void;
  setTasksCompletion: (
    ids: string[],
    completed: boolean,
    actorUserId?: string,
  ) => void;
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

const initialState = normalizeTodoState(undefined);

export const useTodos = create<TodoState>()(
  persist(
    (set, get) => ({
      ...initialState,
      syncError: undefined,

      createList: (name, kind = 'checklist') => {
        const clean = cleanName(name);
        if (!clean) return undefined;
        const now = nowIso();
        const list: TodoList = {
          id: newUuid(),
          name: clean,
          kind,
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

      reorderTasks: (listId, orderedIds) => {
        const list = get().lists.find((item) => item.id === listId);
        if (!list || list.role !== 'owner') return;
        const positions = new Map(orderedIds.map((id, index) => [id, index]));
        if (positions.size === 0) return;
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((task) => {
            const position = positions.get(task.id);
            return task.listId === listId && position !== undefined
              ? { ...task, position }
              : task;
          }),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'reorder_tasks', {
              orderedIds: [...positions.keys()],
            }),
          ],
        }));
      },

      reorderRecipes: (listId, orderedIds) => {
        const list = get().lists.find((item) => item.id === listId);
        if (!list || list.role !== 'owner') return;
        const positions = new Map(orderedIds.map((id, index) => [id, index]));
        if (positions.size === 0) return;
        markGuestEdit();
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            const position = positions.get(recipe.id);
            return recipe.listId === listId && position !== undefined
              ? { ...recipe, position }
              : recipe;
          }),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'reorder_recipes', {
              orderedIds: [...positions.keys()],
            }),
          ],
        }));
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

      setListKind: (id, kind) => {
        const list = get().lists.find((item) => item.id === id);
        if (!list || list.role !== 'owner') return false;
        if (
          kind === 'checklist' &&
          get().recipes.some((recipe) => recipe.listId === id)
        ) {
          return false;
        }
        if (list.kind === kind) return true;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          lists: state.lists.map((item) =>
            item.id === id ? { ...item, kind, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'set_list_kind', { kind }),
          ],
        }));
        return true;
      },

      deleteList: (id) => {
        const list = get().lists.find((item) => item.id === id);
        if (!list || list.role !== 'owner' || list.mode === 'shared') return;
        markGuestEdit();
        set((state) => ({
          lists: state.lists.filter((item) => item.id !== id),
          tasks: state.tasks.filter((task) => task.listId !== id),
          recipes: state.recipes.filter((recipe) => recipe.listId !== id),
          members: state.members.filter((member) => member.listId !== id),
        }));
      },

      addTask: (listId, maybeTitle) => {
        const legacyCall = maybeTitle === undefined;
        const list = legacyCall ? get().lists[0] : get().lists.find((item) => item.id === listId);
        const clean = cleanTitle(legacyCall ? listId : maybeTitle);
        if (!list || list.role !== 'owner' || !clean) return undefined;
        const now = nowIso();
        const positions = get().tasks
          .filter((task) => task.listId === list.id)
          .flatMap((task) =>
            typeof task.position === 'number' ? [task.position] : [],
          );
        const task: TodoTask = {
          id: newUuid(),
          listId: list.id,
          position: positions.length ? Math.min(...positions) - 1 : 0,
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

      ...createTodoRecipeActions(set, get),

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

      setTasksCompletion: (ids, completed, actorUserId) => {
        const requestedIds = new Set(ids);
        if (requestedIds.size === 0) return;
        const listsById = new Map(get().lists.map((list) => [list.id, list]));
        const allowedTasks = get().tasks.filter((task) => {
          const list = listsById.get(task.listId);
          return (
            requestedIds.has(task.id) &&
            Boolean(list && canCompleteTodo(list, task, actorUserId))
          );
        });
        if (allowedTasks.length === 0) return;

        const updatedAt = nowIso();
        const allowedIds = new Set(allowedTasks.map((task) => task.id));
        const groupedIds = new Map<string, string[]>();
        for (const task of allowedTasks) {
          groupedIds.set(task.listId, [
            ...(groupedIds.get(task.listId) ?? []),
            task.id,
          ]);
        }
        const mutations = [...groupedIds.entries()].flatMap(
          ([listId, taskIds]) =>
            queuedMutation(
              listsById.get(listId),
              'set_tasks_completion',
              { taskIds, completed },
            ),
        );

        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((task) =>
            allowedIds.has(task.id)
              ? {
                  ...task,
                  completed,
                  completedAt: completed ? updatedAt : undefined,
                  completedByUserId: completed ? actorUserId : undefined,
                  updatedAt,
                }
              : task,
          ),
          lists: state.lists.map((list) =>
            groupedIds.has(list.id) ? { ...list, updatedAt } : list,
          ),
          pendingMutations: [...state.pendingMutations, ...mutations],
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
        const deleteRecipeId =
          task.recipeId &&
          !get().tasks.some(
            (item) => item.recipeId === task.recipeId && item.id !== task.id,
          )
            ? task.recipeId
            : undefined;
        const deleteRecipeImagePath = deleteRecipeId
          ? get().recipes.find((recipe) => recipe.id === deleteRecipeId)
              ?.sourceImagePath
          : undefined;
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.filter((item) => item.id !== id),
          recipes: deleteRecipeId
            ? state.recipes.filter((recipe) => recipe.id !== deleteRecipeId)
            : state.recipes,
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'delete_task', {
              taskId: id,
              deleteRecipeId,
              ...(deleteRecipeImagePath
                ? { sourceImagePath: deleteRecipeImagePath }
                : {}),
            }),
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
        const completedIdSet = new Set(completedIds);
        const remainingRecipeIds = new Set(
          get().tasks
            .filter(
              (task) =>
                task.listId === list.id &&
                !completedIdSet.has(task.id) &&
                task.recipeId,
            )
            .map((task) => task.recipeId as string),
        );
        const deletedRecipes = get().recipes
          .filter(
            (recipe) =>
              recipe.listId === list.id && !remainingRecipeIds.has(recipe.id),
          )
          .map((recipe) => ({
            id: recipe.id,
            sourceImagePath: recipe.sourceImagePath,
          }));
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.filter((task) => !completedIds.includes(task.id)),
          recipes: state.recipes.filter(
            (recipe) =>
              recipe.listId !== list.id || remainingRecipeIds.has(recipe.id),
          ),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'clear_completed', { deletedRecipes }),
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
            recipes: [
              ...incoming.recipes.filter((recipe) =>
                incoming.lists.some(
                  (list) =>
                    list.id === recipe.listId && list.mode === 'private',
                ),
              ),
              ...state.recipes.filter((recipe) => sharedIds.has(recipe.listId)),
            ],
          };
        });
      },

      replaceSharedSnapshot: (snapshot) => {
        const list = normalizeList(
          { ...snapshot.list, mode: 'shared' },
          false,
        );
        if (!list) return;
        const tasks = snapshot.tasks.flatMap((item) => {
          const task = normalizeTask(item, list.id);
          return task ? [task] : [];
        });
        const recipes = (snapshot.recipes ?? []).flatMap((item) => {
          const recipe = normalizeRecipe({ ...item, listId: list.id });
          return recipe ? [recipe] : [];
        });
        const members = snapshot.members.flatMap((item) => {
          const member = normalizeMember(item);
          return member ? [member] : [];
        });
        set((state) => {
          // Prefer server positions so collaborator reorders propagate. Pending
          // local mutations skip snapshot apply until flushed.
          const orderedTasks = tasks.map((task, index) => ({
            ...task,
            position: task.position ?? index,
          }));
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
            tasks: [
              ...orderedTasks,
              ...state.tasks.filter((item) => item.listId !== list.id),
            ],
            recipes: [
              ...recipes,
              ...state.recipes.filter((item) => item.listId !== list.id),
            ],
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
          recipes: state.recipes.filter((recipe) => recipe.listId !== listId),
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
      version: 4,
      migrate: (persistedState) => normalizeTodoState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeTodoState(persistedState),
      }),
      partialize: (state) =>
        ({
          groceryMigrationVersion: state.groceryMigrationVersion,
          lists: state.lists,
          tasks: state.tasks,
          recipes: state.recipes,
          members: state.members,
          invites: state.invites,
          pendingMutations: state.pendingMutations,
        }) as TodoState,
    },
  ),
);
