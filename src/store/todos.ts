import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isGuestDirtyTrackingSuppressed } from '@/features/auth/guest-dirty-tracking';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import { useAuthAccess } from '@/store/auth-access';

export type TodoListMode = 'private' | 'shared';
export type TodoListRole = 'owner' | 'member';
export type TodoListKind = 'checklist' | 'grocery';
export type TodoRecipeSourceKind = 'url' | 'image';

export interface TodoList {
  id: string;
  name: string;
  kind: TodoListKind;
  mode: TodoListMode;
  role: TodoListRole;
  ownerUserId?: string;
  ownerName?: string;
  shareCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoRecipe {
  id: string;
  listId: string;
  name: string;
  sourceKind: TodoRecipeSourceKind;
  sourceUrl?: string;
  sourceImageUri?: string;
  sourceImagePath?: string;
  originalServings?: number;
  targetServings?: number;
  position?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodoIngredientInput {
  name: string;
  canonicalKey?: string;
  quantityValue?: number;
  quantityText?: string;
  unit?: string;
  preparation?: string;
  originalText?: string;
  confidence?: number;
}

export interface TodoRecipeInput {
  name: string;
  sourceKind: TodoRecipeSourceKind;
  sourceUrl?: string;
  sourceImageUri?: string;
  originalServings?: number;
  targetServings?: number;
  ingredients: TodoIngredientInput[];
}

export interface TodoTask {
  id: string;
  listId: string;
  position?: number;
  recipeId?: string;
  ingredientPosition?: number;
  ingredientName?: string;
  canonicalKey?: string;
  quantityValue?: number;
  quantityText?: string;
  unit?: string;
  preparation?: string;
  originalText?: string;
  confidence?: number;
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
  | 'set_list_kind'
  | 'add_task'
  | 'add_recipe'
  | 'update_recipe'
  | 'delete_recipe'
  | 'update_ingredient'
  | 'reorder_tasks'
  | 'reorder_recipes'
  | 'update_task'
  | 'delete_task'
  | 'set_completion'
  | 'set_tasks_completion'
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
  groceryMigrationVersion: 1;
  lists: TodoList[];
  tasks: TodoTask[];
  recipes: TodoRecipe[];
  members: TodoMember[];
  invites: TodoInvite[];
  pendingMutations: PendingTodoMutation[];
}

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

export interface TodoSharedSnapshot {
  list: TodoList;
  tasks: TodoTask[];
  recipes?: TodoRecipe[];
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

function cleanOptional(value: unknown, limit = 160) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, limit) || undefined
    : undefined;
}

/** Recipe source links must be https so synced lists cannot plant custom schemes. */
function cleanHttpsUrl(value: unknown, limit = 2_000) {
  const cleaned = cleanOptional(value, limit);
  if (!cleaned) return undefined;
  try {
    return new URL(cleaned).protocol === 'https:' ? cleaned : undefined;
  } catch {
    return undefined;
  }
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

export function isGroceryListName(name: string) {
  return /\b(grocer(?:y|ies)|supermarket)\b/i.test(name.trim());
}

export function canonicalIngredientKey(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function formatIngredientTitle(
  ingredient: Pick<
    TodoIngredientInput,
    'name' | 'quantityText' | 'unit' | 'preparation'
  >,
) {
  const amount = [cleanOptional(ingredient.quantityText, 40), cleanOptional(ingredient.unit, 40)]
    .filter(Boolean)
    .join(' ');
  const name = cleanOptional(ingredient.name, 100) ?? '';
  const preparation = cleanOptional(ingredient.preparation, 80);
  return cleanTitle(
    [amount, name, preparation ? `(${preparation})` : undefined]
      .filter(Boolean)
      .join(' '),
  );
}

function formatQuantityValue(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function markGuestEdit() {
  if (!isGuestDirtyTrackingSuppressed()) {
    useAuthAccess.getState().markGuestDataDirty();
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function normalizeList(
  value: unknown,
  upgradeRecognizedGroceryName = false,
): TodoList | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<TodoList>;
  const id = stringValue(candidate.id);
  const name = typeof candidate.name === 'string' ? cleanName(candidate.name) : '';
  if (!id || !name) return undefined;
  const createdAt = stringValue(candidate.createdAt) ?? nowIso();
  return {
    id,
    name,
    kind:
      candidate.kind === 'grocery' ||
      (upgradeRecognizedGroceryName && isGroceryListName(name)) ||
      (candidate.kind !== 'checklist' && isGroceryListName(name))
        ? 'grocery'
        : 'checklist',
    mode: candidate.mode === 'shared' ? 'shared' : 'private',
    role: candidate.role === 'member' ? 'member' : 'owner',
    ownerUserId: stringValue(candidate.ownerUserId),
    ownerName: stringValue(candidate.ownerName),
    shareCode: stringValue(candidate.shareCode),
    createdAt,
    updatedAt: stringValue(candidate.updatedAt) ?? createdAt,
  };
}

function normalizeRecipe(value: unknown): TodoRecipe | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<TodoRecipe>;
  const id = stringValue(candidate.id);
  const listId = stringValue(candidate.listId);
  const name = typeof candidate.name === 'string' ? cleanName(candidate.name) : '';
  if (!id || !listId || !name) return undefined;
  const createdAt = stringValue(candidate.createdAt) ?? nowIso();
  return {
    id,
    listId,
    name,
    sourceKind: candidate.sourceKind === 'image' ? 'image' : 'url',
    sourceUrl: cleanHttpsUrl(candidate.sourceUrl, 2_000),
    sourceImageUri: cleanOptional(candidate.sourceImageUri, 6_000_000),
    sourceImagePath: cleanOptional(candidate.sourceImagePath, 500),
    originalServings: positiveNumber(candidate.originalServings),
    targetServings: positiveNumber(candidate.targetServings),
    position: finiteNumber(candidate.position),
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
  const recipeId = stringValue(candidate.recipeId);
  const ingredientName = recipeId
    ? cleanOptional(candidate.ingredientName, 100)
    : undefined;
  return {
    id: stringValue(candidate.id) ?? newId(),
    listId,
    position:
      typeof candidate.position === 'number' && Number.isFinite(candidate.position)
        ? candidate.position
        : undefined,
    recipeId,
    ingredientPosition: recipeId
      ? finiteNonNegative(candidate.ingredientPosition)
      : undefined,
    ingredientName,
    canonicalKey: recipeId
      ? cleanOptional(candidate.canonicalKey, 120) ??
        (ingredientName ? canonicalIngredientKey(ingredientName) : undefined)
      : undefined,
    quantityValue: recipeId
      ? finiteNonNegative(candidate.quantityValue)
      : undefined,
    quantityText: recipeId
      ? cleanOptional(candidate.quantityText, 40)
      : undefined,
    unit: recipeId ? cleanOptional(candidate.unit, 40) : undefined,
    preparation: recipeId
      ? cleanOptional(candidate.preparation, 80)
      : undefined,
    originalText: recipeId
      ? cleanOptional(candidate.originalText, 240)
      : undefined,
    confidence:
      recipeId && typeof candidate.confidence === 'number' && Number.isFinite(candidate.confidence)
        ? Math.max(0, Math.min(1, candidate.confidence))
        : undefined,
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
    'set_list_kind',
    'add_task',
    'add_recipe',
    'update_recipe',
    'delete_recipe',
    'update_ingredient',
    'reorder_tasks',
    'reorder_recipes',
    'update_task',
    'delete_task',
    'set_completion',
    'set_tasks_completion',
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
  const upgradeRecognizedGroceryNames =
    source.groceryMigrationVersion !== 1;
  let lists = Array.isArray(source.lists)
    ? source.lists.flatMap((item) => {
        const list = normalizeList(item, upgradeRecognizedGroceryNames);
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
        kind: 'checklist',
        mode: 'private',
        role: 'owner',
        createdAt,
        updatedAt: nowIso(),
      },
      ...lists,
    ];
  }

  const listIds = new Set(lists.map((list) => list.id));
  const recipes = Array.isArray(source.recipes)
    ? source.recipes.flatMap((item) => {
        const recipe = normalizeRecipe(item);
        return recipe && listIds.has(recipe.listId) ? [recipe] : [];
      })
    : [];
  const recipeListIds = new Set(recipes.map((recipe) => recipe.listId));
  lists = lists.map((list) =>
    recipeListIds.has(list.id) && list.kind !== 'grocery'
      ? { ...list, kind: 'grocery' }
      : list,
  );
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));
  let tasks = rawTasks.length > 0
    ? rawTasks.flatMap((item) => {
        const task = normalizeTask(item, fallbackListId);
        if (!task || !listIds.has(task.listId)) return [];
        const normalizedTask =
          task.recipeId && !recipeIds.has(task.recipeId)
            ? {
                ...task,
                recipeId: undefined,
                ingredientPosition: undefined,
                ingredientName: undefined,
                canonicalKey: undefined,
                quantityValue: undefined,
                quantityText: undefined,
                unit: undefined,
                preparation: undefined,
                originalText: undefined,
                confidence: undefined,
              }
            : task;
        return [{ ...normalizedTask, id: legacyTasks ? newId() : task.id }];
      })
    : [];

  if (lists.length === 0 && tasks.length === 0) {
    const createdAt = nowIso();
    const list: TodoList = {
      id: newId(),
      name: 'To Do',
      kind: 'checklist',
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
    groceryMigrationVersion: 1,
    lists: [...dedupedLists.values()],
    tasks: [...new Map(tasks.map((task) => [task.id, task])).values()],
    recipes: [
      ...new Map(
        recipes
          .filter((recipe) => validListIds.has(recipe.listId))
          .map((recipe) => [recipe.id, recipe]),
      ).values(),
    ],
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
    groceryMigrationVersion: 1 as const,
    lists: state.lists.filter((list) => privateListIds.has(list.id)),
    tasks: state.tasks.filter((task) => privateListIds.has(task.listId)),
    recipes: state.recipes.filter((recipe) => privateListIds.has(recipe.listId)),
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

      createList: (name, kind = 'checklist') => {
        const clean = cleanName(name);
        if (!clean) return undefined;
        const now = nowIso();
        const list: TodoList = {
          id: newId(),
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
          id: newId(),
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

      addRecipe: (listId, input) => {
        const list = get().lists.find((item) => item.id === listId);
        const name = cleanName(input.name);
        const ingredients = input.ingredients.flatMap((ingredient) => {
          const ingredientName = cleanOptional(ingredient.name, 100);
          if (!ingredientName) return [];
          const quantityValue = finiteNonNegative(ingredient.quantityValue);
          const quantityText =
            cleanOptional(ingredient.quantityText, 40) ??
            (quantityValue !== undefined
              ? formatQuantityValue(quantityValue)
              : undefined);
          const normalized: TodoIngredientInput = {
            name: ingredientName,
            canonicalKey:
              cleanOptional(ingredient.canonicalKey, 120) ??
              canonicalIngredientKey(ingredientName),
            quantityValue,
            quantityText,
            unit: cleanOptional(ingredient.unit, 40),
            preparation: cleanOptional(ingredient.preparation, 80),
            originalText: cleanOptional(ingredient.originalText, 240),
            confidence:
              typeof ingredient.confidence === 'number' &&
              Number.isFinite(ingredient.confidence)
                ? Math.max(0, Math.min(1, ingredient.confidence))
                : undefined,
          };
          return [normalized];
        });
        if (
          !list ||
          list.kind !== 'grocery' ||
          list.role !== 'owner' ||
          !name ||
          ingredients.length === 0
        ) {
          return undefined;
        }

        const now = nowIso();
        const recipePositions = get().recipes
          .filter((recipe) => recipe.listId === listId)
          .flatMap((recipe) =>
            typeof recipe.position === 'number' ? [recipe.position] : [],
          );
        const recipe: TodoRecipe = {
          id: newId(),
          listId,
          name,
          sourceKind: input.sourceKind === 'image' ? 'image' : 'url',
          sourceUrl: cleanHttpsUrl(input.sourceUrl, 2_000),
          sourceImageUri:
            typeof input.sourceImageUri === 'string' && input.sourceImageUri.trim()
              ? input.sourceImageUri.trim()
              : undefined,
          originalServings: positiveNumber(input.originalServings),
          targetServings:
            positiveNumber(input.targetServings) ??
            positiveNumber(input.originalServings),
          position: recipePositions.length
            ? Math.min(...recipePositions) - 1
            : 0,
          createdAt: now,
          updatedAt: now,
        };
        const tasks: TodoTask[] = ingredients.map((ingredient, index) => ({
          id: newId(),
          listId,
          recipeId: recipe.id,
          ingredientPosition: index,
          ingredientName: ingredient.name,
          canonicalKey: ingredient.canonicalKey,
          quantityValue: ingredient.quantityValue,
          quantityText: ingredient.quantityText,
          unit: ingredient.unit,
          preparation: ingredient.preparation,
          originalText: ingredient.originalText,
          confidence: ingredient.confidence,
          title: formatIngredientTitle(ingredient),
          completed: false,
          important: false,
          createdAt: now,
          updatedAt: now,
          version: 0,
        }));

        markGuestEdit();
        set((state) => ({
          recipes: [recipe, ...state.recipes],
          tasks: [...tasks, ...state.tasks],
          lists: state.lists.map((item) =>
            item.id === listId ? { ...item, updatedAt: now } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'add_recipe', { recipe, tasks }),
          ],
        }));
        return recipe;
      },

      updateRecipe: (id, patch) => {
        const recipe = get().recipes.find((item) => item.id === id);
        const list = recipe
          ? get().lists.find((item) => item.id === recipe.listId)
          : undefined;
        if (!recipe || !list || list.role !== 'owner') return;
        const name =
          patch.name === undefined ? recipe.name : cleanName(patch.name);
        if (!name) return;
        const updatedAt = nowIso();
        const next: TodoRecipe = {
          ...recipe,
          name,
          sourceUrl:
            patch.sourceUrl === undefined
              ? recipe.sourceUrl
              : cleanHttpsUrl(patch.sourceUrl, 2_000),
          targetServings:
            patch.targetServings === undefined
              ? recipe.targetServings
              : positiveNumber(patch.targetServings),
          updatedAt,
        };
        markGuestEdit();
        set((state) => ({
          recipes: state.recipes.map((item) => (item.id === id ? next : item)),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'update_recipe', { recipe: next }),
          ],
        }));
      },

      deleteRecipe: (id) => {
        const recipe = get().recipes.find((item) => item.id === id);
        const list = recipe
          ? get().lists.find((item) => item.id === recipe.listId)
          : undefined;
        if (!recipe || !list || list.role !== 'owner') return;
        const updatedAt = nowIso();
        markGuestEdit();
        set((state) => ({
          recipes: state.recipes.filter((item) => item.id !== id),
          tasks: state.tasks.filter((task) => task.recipeId !== id),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'delete_recipe', {
              recipeId: id,
              sourceImagePath: recipe.sourceImagePath,
            }),
          ],
        }));
      },

      updateIngredient: (id, patch) => {
        const task = get().tasks.find((item) => item.id === id);
        const list = task
          ? get().lists.find((item) => item.id === task.listId)
          : undefined;
        if (!task?.recipeId || !list || list.role !== 'owner') return;
        const ingredientName =
          patch.name === undefined
            ? task.ingredientName
            : cleanOptional(patch.name, 100);
        if (!ingredientName) return;
        const quantityValue =
          patch.quantityValue === undefined
            ? task.quantityValue
            : finiteNonNegative(patch.quantityValue);
        const quantityText =
          patch.quantityText === undefined
            ? task.quantityText
            : cleanOptional(patch.quantityText, 40);
        const updatedAt = nowIso();
        const next: TodoTask = {
          ...task,
          ingredientName,
          canonicalKey:
            patch.canonicalKey === undefined
              ? task.canonicalKey ?? canonicalIngredientKey(ingredientName)
              : cleanOptional(patch.canonicalKey, 120) ??
                canonicalIngredientKey(ingredientName),
          quantityValue,
          quantityText,
          unit:
            patch.unit === undefined
              ? task.unit
              : cleanOptional(patch.unit, 40),
          preparation:
            patch.preparation === undefined
              ? task.preparation
              : cleanOptional(patch.preparation, 80),
          originalText:
            patch.originalText === undefined
              ? task.originalText
              : cleanOptional(patch.originalText, 240),
          confidence:
            patch.confidence === undefined
              ? task.confidence
              : typeof patch.confidence === 'number' &&
                  Number.isFinite(patch.confidence)
                ? Math.max(0, Math.min(1, patch.confidence))
                : undefined,
          title: formatIngredientTitle({
            name: ingredientName,
            quantityText,
            unit:
              patch.unit === undefined
                ? task.unit
                : cleanOptional(patch.unit, 40),
            preparation:
              patch.preparation === undefined
                ? task.preparation
                : cleanOptional(patch.preparation, 80),
          }),
          updatedAt,
        };
        markGuestEdit();
        set((state) => ({
          tasks: state.tasks.map((item) => (item.id === id ? next : item)),
          lists: state.lists.map((item) =>
            item.id === list.id ? { ...item, updatedAt } : item,
          ),
          pendingMutations: [
            ...state.pendingMutations,
            ...queuedMutation(list, 'update_ingredient', { task: next }),
          ],
        }));
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
          const existingPositions = new Map(
            state.tasks
              .filter((task) => task.listId === list.id)
              .map((task) => [task.id, task.position]),
          );
          const orderedTasks = tasks.map((task, index) => ({
            ...task,
            position:
              existingPositions.get(task.id) ??
              task.position ??
              index,
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
