import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/services/cloud/supabase';
import {
    cleanupRecipeMutationMedia,
    prepareRecipeMutationMedia,
    removeSharedRecipeImages,
    resolveSharedRecipeMedia,
} from '@/services/todos/recipe-media';
import {
    normalizeTodoState,
    type PendingTodoMutation,
    type TodoInvite,
    type TodoList,
    type TodoSharedSnapshot,
    useTodos,
} from '@/store/todos';
import { newUuid } from '@/utils/id';

export class TodoCollaborationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TodoCollaborationError';
  }
}

function messageFrom(error: { message?: string } | null, fallback: string) {
  return error?.message?.trim() || fallback;
}

async function authenticatedClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new TodoCollaborationError(
      'Shared lists are not configured for this build.',
    );
  }
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    throw new TodoCollaborationError('Sign in to share or join a list.');
  }
  return client;
}

function sharedSnapshot(value: unknown): TodoSharedSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as {
    list?: unknown;
    tasks?: unknown;
    members?: unknown;
    recipes?: unknown;
  };
  const normalized = normalizeTodoState({
    groceryMigrationVersion: 1,
    lists: candidate.list ? [candidate.list] : [],
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks : [],
    recipes: Array.isArray(candidate.recipes) ? candidate.recipes : [],
    members: Array.isArray(candidate.members) ? candidate.members : [],
  });
  const list = normalized.lists.find((item) => item.mode === 'shared');
  if (!list) return undefined;
  return {
    list,
    tasks: normalized.tasks.filter((task) => task.listId === list.id),
    recipes: normalized.recipes.filter((recipe) => recipe.listId === list.id),
    members: normalized.members.filter((member) => member.listId === list.id),
  };
}

export async function loadTodoListSnapshot(
  listId: string,
  options?: { applyWhilePending?: boolean },
): Promise<TodoSharedSnapshot | undefined> {
  if (
    !options?.applyWhilePending &&
    useTodos
      .getState()
      .pendingMutations.some((mutation) => mutation.listId === listId)
  ) {
    // Keep optimistic local edits until the queue for this list drains.
    return undefined;
  }
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('todo_list_snapshot', {
    requested_list_id: listId,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'The shared list could not be refreshed.'),
    );
  }
  const parsed = sharedSnapshot(data);
  const snapshot = parsed
    ? await resolveSharedRecipeMedia(client, parsed)
    : undefined;
  if (snapshot) useTodos.getState().replaceSharedSnapshot(snapshot);
  else useTodos.getState().removeSharedList(listId);
  return snapshot;
}

async function ensureListMutationsFlushed(listId: string) {
  await flushTodoMutations();
  const stillPending = useTodos
    .getState()
    .pendingMutations.some((mutation) => mutation.listId === listId);
  if (stillPending) {
    throw new TodoCollaborationError(
      'Wait for your latest changes to sync before continuing.',
    );
  }
}

export async function publishTodoList(listId: string): Promise<TodoSharedSnapshot> {
  const state = useTodos.getState();
  const list = state.lists.find((item) => item.id === listId);
  if (!list || list.mode !== 'private' || list.role !== 'owner') {
    throw new TodoCollaborationError('Only a private list owner can share it.');
  }
  const client = await authenticatedClient();
  const recipes = state.recipes.filter((recipe) => recipe.listId === list.id);
  // Publish first so storage RLS recognizes list ownership, then upload images.
  const { error } = await client.rpc('publish_todo_list', {
    list_payload: {
      id: list.id,
      name: list.name,
      kind: list.kind,
      recipes: recipes.map((recipe) => ({
        ...recipe,
        sourceImagePath: recipe.sourceImagePath,
        sourceImageUri: undefined,
      })),
      tasks: state.tasks.filter((task) => task.listId === list.id),
    },
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'The list could not be shared.'),
    );
  }

  const needingUpload = recipes.filter(
    (recipe) => recipe.sourceImageUri && !recipe.sourceImagePath,
  );
  // Queue thumbnail uploads before snapshot so a failed upload remains retryable
  // via flushTodoMutations after the list becomes shared.
  if (needingUpload.length) {
    const createdAt = new Date().toISOString();
    useTodos.setState((current) => ({
      pendingMutations: [
        ...current.pendingMutations,
        ...needingUpload.map((recipe) => ({
          id: newUuid(),
          listId: list.id,
          operation: 'update_recipe' as const,
          createdAt,
          attempts: 0,
          payload: { recipe },
        })),
      ],
    }));
  }

  // Reconcile local private → shared immediately so retries don't re-insert.
  // Image uploads are intentionally still pending — force-apply the shared shell.
  let snapshot = await loadTodoListSnapshot(listId, {
    applyWhilePending: true,
  });
  if (!snapshot) {
    throw new TodoCollaborationError('The shared list could not be loaded.');
  }

  if (needingUpload.length) {
    // Snapshot drops private file URIs — restore them for UI until upload acks.
    const localUriById = new Map(
      needingUpload.map((recipe) => [recipe.id, recipe.sourceImageUri] as const),
    );
    useTodos.setState((current) => ({
      recipes: current.recipes.map((recipe) => {
        const localUri = localUriById.get(recipe.id);
        return localUri && !recipe.sourceImagePath
          ? { ...recipe, sourceImageUri: localUri }
          : recipe;
      }),
    }));

    // flushTodoMutations swallows transient prep/RPC failures; check pending after.
    await flushTodoMutations();
    const stillPending = useTodos
      .getState()
      .pendingMutations.some(
        (mutation) =>
          mutation.listId === list.id && mutation.operation === 'update_recipe',
      );
    if (stillPending) {
      throw new TodoCollaborationError(
        'Recipe photos could not be shared yet. They will retry automatically.',
      );
    }
    snapshot = (await loadTodoListSnapshot(listId)) ?? snapshot;
  }

  return snapshot;
}

function permanentMutationError(message: string) {
  return /no longer have access|only the list owner|only an editor or owner|assigned to someone else|not a member|Recipes can only be added to Grocery lists/i.test(
    message,
  );
}

function permanentMediaPrepError(message: string) {
  return /recipe thumbnail could not be read/i.test(message);
}

const TODO_MUTATION_BATCH_SIZE = 50;

export async function flushTodoMutations(): Promise<void> {
  const client = await authenticatedClient();
  while (true) {
    const batch = useTodos
      .getState()
      .pendingMutations.slice(0, TODO_MUTATION_BATCH_SIZE);
    if (batch.length === 0) return;
    batch.forEach((mutation) => {
      useTodos.getState().markMutationAttempt(mutation.id);
    });

    // Prepare per mutation so one bad local image cannot stall the queue.
    const preparedResults = await Promise.all(
      batch.map(async (mutation) => {
        try {
          const prepared = await prepareRecipeMutationMedia(client, mutation);
          if (prepared !== mutation) {
            // Persist uploaded path so a later RPC failure does not re-upload.
            useTodos.setState((state) => ({
              pendingMutations: state.pendingMutations.map((item) =>
                item.id === mutation.id
                  ? { ...item, payload: prepared.payload }
                  : item,
              ),
            }));
          }
          return { mutation: prepared };
        } catch (error) {
          return {
            mutation,
            error:
              error instanceof Error
                ? error.message
                : 'Recipe media could not be prepared.',
          };
        }
      }),
    );

    let shouldRetryLater = false;
    const rejectedLists = new Set<string>();
    const ready: PendingTodoMutation[] = [];
    for (const result of preparedResults) {
      if (!result.error) {
        ready.push(result.mutation);
        continue;
      }
      if (permanentMediaPrepError(result.error)) {
        useTodos.getState().rejectMutation(result.mutation.id, result.error);
        rejectedLists.add(result.mutation.listId);
      } else {
        shouldRetryLater = true;
      }
    }

    if (ready.length === 0) {
      await Promise.all(
        [...rejectedLists].map((listId) =>
          // Force reconcile so a permanent reject cannot leave optimistic UI
          // stuck behind sibling soft-failing mutations.
          loadTodoListSnapshot(listId, { applyWhilePending: true }).catch(
            () => undefined,
          ),
        ),
      );
      return;
    }

    const { data, error } = await client.rpc('apply_todo_mutations', {
      mutations: ready.map((mutation) => ({
        id: mutation.id,
        listId: mutation.listId,
        operation: mutation.operation,
        payload: mutation.payload,
      })),
    });
    if (error || !Array.isArray(data)) return;

    const results = new Map<string, { ok: boolean; error?: string }>();
    for (const value of data) {
      if (!value || typeof value !== 'object') continue;
      const result = value as Record<string, unknown>;
      if (typeof result.id !== 'string' || typeof result.ok !== 'boolean') continue;
      results.set(result.id, {
        ok: result.ok,
        error: typeof result.error === 'string' ? result.error : undefined,
      });
    }

    const acknowledged = ready.filter(
      (mutation) => results.get(mutation.id)?.ok,
    );
    for (const mutation of ready) {
      const result = results.get(mutation.id);
      if (result?.ok) {
        useTodos.getState().acknowledgeMutation(mutation.id);
      } else if (result?.error && permanentMutationError(result.error)) {
        useTodos.getState().rejectMutation(mutation.id, result.error);
        rejectedLists.add(mutation.listId);
      } else {
        shouldRetryLater = true;
      }
    }
    await Promise.all(
      acknowledged.map((mutation) =>
        cleanupRecipeMutationMedia(client, mutation).catch(() => undefined),
      ),
    );
    await Promise.all(
      [...rejectedLists].map((listId) =>
        loadTodoListSnapshot(listId, { applyWhilePending: true }).catch(
          () => undefined,
        ),
      ),
    );
    if (shouldRetryLater) return;
  }
}

export async function loadTodoInvites(): Promise<TodoInvite[]> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('list_todo_email_invites');
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'Invitations could not be loaded.'),
    );
  }
  const invites: TodoInvite[] = Array.isArray(data)
    ? data.flatMap((row) => {
        if (!row || typeof row !== 'object') return [];
        const item = row as Record<string, unknown>;
        if (
          typeof item.id !== 'string' ||
          typeof item.list_id !== 'string' ||
          typeof item.list_name !== 'string' ||
          typeof item.inviter_name !== 'string' ||
          typeof item.invitee_email !== 'string'
        ) {
          return [];
        }
        return [{
          id: item.id,
          listId: item.list_id,
          listName: item.list_name,
          inviterName: item.inviter_name,
          inviteeEmail: item.invitee_email,
          code: item.id,
          createdAt:
            typeof item.created_at === 'string'
              ? item.created_at
              : new Date().toISOString(),
        }];
      })
    : [];
  useTodos.getState().replaceInvites(invites);
  return invites;
}

export async function loadAllSharedTodoLists(): Promise<void> {
  const client = await authenticatedClient();
  await flushTodoMutations();
  const { data, error } = await client.rpc('todo_shared_list_ids');
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'Shared lists could not be loaded.'),
    );
  }
  const ids = Array.isArray(data)
    ? data.flatMap((row) =>
        row && typeof row === 'object' && typeof row.list_id === 'string'
          ? [row.list_id]
          : [],
      )
    : [];
  const remoteIds = new Set(ids);
  for (const list of useTodos.getState().lists) {
    if (list.mode === 'shared' && !remoteIds.has(list.id)) {
      useTodos.getState().removeSharedList(list.id);
    }
  }
  const pendingListIds = new Set(
    useTodos
      .getState()
      .pendingMutations.map((mutation) => mutation.listId),
  );
  await Promise.all(
    ids.map((id) =>
      // Keep optimistic local edits when flush could not clear the queue.
      pendingListIds.has(id) ? Promise.resolve() : loadTodoListSnapshot(id),
    ),
  );
  await loadTodoInvites();
}

export async function createTodoEmailInvite(
  listId: string,
  email: string,
): Promise<void> {
  const client = await authenticatedClient();
  const { error } = await client.rpc('create_todo_email_invite', {
    requested_list_id: listId,
    requested_email: email.trim().toLowerCase(),
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'The invitation could not be created.'),
    );
  }
}

export interface PendingTodoEmailInvite {
  id: string;
  email: string;
  createdAt: string;
}

export async function loadTodoListPendingInvites(
  listId: string,
): Promise<PendingTodoEmailInvite[]> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('todo_list_pending_invites', {
    requested_list_id: listId,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'Pending invitations could not be loaded.'),
    );
  }
  return Array.isArray(data)
    ? data.flatMap((row) =>
        row &&
        typeof row.id === 'string' &&
        typeof row.invitee_email === 'string'
          ? [{
              id: row.id,
              email: row.invitee_email,
              createdAt:
                typeof row.created_at === 'string'
                  ? row.created_at
                  : new Date().toISOString(),
            }]
          : [],
      )
    : [];
}

export async function revokeTodoEmailInvite(inviteId: string): Promise<void> {
  const client = await authenticatedClient();
  const { error } = await client.rpc('revoke_todo_email_invite', {
    invite_id: inviteId,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'The invitation could not be revoked.'),
    );
  }
}

export async function acceptTodoEmailInvite(inviteId: string): Promise<string> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('accept_todo_email_invite', {
    invite_id: inviteId,
  });
  if (error || typeof data !== 'string') {
    throw new TodoCollaborationError(
      messageFrom(error, 'The invitation could not be accepted.'),
    );
  }
  await loadTodoListSnapshot(data);
  await loadTodoInvites();
  return data;
}

export async function createTodoShareLink(listId: string): Promise<string> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('create_todo_share_link', {
    requested_list_id: listId,
  });
  if (error || typeof data !== 'string') {
    throw new TodoCollaborationError(
      messageFrom(error, 'A share link could not be created.'),
    );
  }
  useTodos.getState().setShareCode(listId, data);
  return data;
}

export async function revokeTodoShareLink(listId: string): Promise<void> {
  const client = await authenticatedClient();
  const { error } = await client.rpc('revoke_todo_share_link', {
    requested_list_id: listId,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'The share link could not be revoked.'),
    );
  }
  useTodos.getState().setShareCode(listId, undefined);
}

export async function resolveTodoShareLink(
  code: string,
): Promise<{ listId: string; listName: string; ownerName: string } | undefined> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('resolve_todo_share_link', {
    link_code: code,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'This list link could not be opened.'),
    );
  }
  const row = Array.isArray(data) ? data[0] : undefined;
  if (
    !row ||
    typeof row.list_id !== 'string' ||
    typeof row.list_name !== 'string' ||
    typeof row.owner_name !== 'string'
  ) {
    return undefined;
  }
  return {
    listId: row.list_id,
    listName: row.list_name,
    ownerName: row.owner_name,
  };
}

export async function acceptTodoShareLink(code: string): Promise<string> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('accept_todo_share_link', {
    link_code: code,
  });
  if (error || typeof data !== 'string') {
    throw new TodoCollaborationError(
      messageFrom(error, 'This list link is invalid or has been revoked.'),
    );
  }
  await loadTodoListSnapshot(data);
  return data;
}

export async function createTodoCollaboratorLink(listIds: string[]): Promise<string> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('create_todo_collaborator_link', {
    requested_list_ids: listIds,
  });
  if (error || typeof data !== 'string') {
    throw new TodoCollaborationError(
      messageFrom(error, 'A collaborator link could not be created.'),
    );
  }
  return data;
}

export async function revokeTodoCollaboratorLink(code: string): Promise<void> {
  const client = await authenticatedClient();
  const { error } = await client.rpc('revoke_todo_collaborator_link', {
    link_code: code,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'The collaborator link could not be revoked.'),
    );
  }
}

export async function resolveTodoCollaboratorLink(
  code: string,
): Promise<{ inviterName: string; listNames: string[] } | undefined> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('resolve_todo_collaborator_link', {
    link_code: code,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'This collaborator link could not be opened.'),
    );
  }
  const row = Array.isArray(data) ? data[0] : undefined;
  if (
    !row ||
    typeof row.inviter_name !== 'string' ||
    !Array.isArray(row.list_names)
  ) {
    return undefined;
  }
  const listNames = row.list_names.filter(
    (name: unknown): name is string => typeof name === 'string',
  );
  return listNames.length ? { inviterName: row.inviter_name, listNames } : undefined;
}

export async function acceptTodoCollaboratorLink(code: string): Promise<string[]> {
  const client = await authenticatedClient();
  const { data, error } = await client.rpc('accept_todo_collaborator_link', {
    link_code: code,
  });
  const listIds = Array.isArray(data)
    ? data.filter((id: unknown): id is string => typeof id === 'string')
    : [];
  if (error || !listIds.length) {
    throw new TodoCollaborationError(
      messageFrom(error, 'This collaborator link is invalid or has been revoked.'),
    );
  }
  await Promise.all(listIds.map((listId) => loadTodoListSnapshot(listId)));
  return listIds;
}

export async function removeTodoMember(listId: string, userId: string) {
  const client = await authenticatedClient();
  const { error } = await client.rpc('remove_todo_member', {
    requested_list_id: listId,
    requested_user_id: userId,
  });
  if (error) throw new TodoCollaborationError(error.message);
  await loadTodoListSnapshot(listId);
}

export async function setTodoMemberRole(
  listId: string,
  userId: string,
  role: 'editor' | 'member',
) {
  const client = await authenticatedClient();
  const { error } = await client.rpc('set_todo_member_role', {
    requested_list_id: listId,
    requested_user_id: userId,
    requested_role: role,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'That member role could not be updated.'),
    );
  }
  await loadTodoListSnapshot(listId);
}

export async function addTodoFriendEditors(
  listId: string,
  userIds: string[],
) {
  const client = await authenticatedClient();
  const { error } = await client.rpc('add_todo_friend_editors', {
    requested_list_id: listId,
    requested_user_ids: userIds,
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'Friends could not be added as editors.'),
    );
  }
  await loadTodoListSnapshot(listId);
}

export async function transferTodoListOwnership(
  listId: string,
  newOwnerUserId: string,
) {
  await ensureListMutationsFlushed(listId);
  const client = await authenticatedClient();
  const { error } = await client.rpc('transfer_todo_list_ownership', {
    requested_list_id: listId,
    new_owner_user_id: newOwnerUserId,
  });
  if (error) throw new TodoCollaborationError(error.message);
  // Former owner's plaintext join code is no longer valid after transfer.
  useTodos.getState().setShareCode(listId, undefined);
  await loadTodoListSnapshot(listId);
}

function restoreSharedListRollback(
  listId: string,
  rollback:
    | {
        list: TodoList;
        tasks: TodoSharedSnapshot['tasks'];
        recipes: TodoSharedSnapshot['recipes'];
        members: TodoSharedSnapshot['members'];
      }
    | undefined,
  pendingRollback: ReturnType<typeof useTodos.getState>['pendingMutations'],
) {
  if (!rollback) return;
  useTodos.getState().replaceSharedSnapshot(rollback);
  if (!pendingRollback.length) return;
  useTodos.setState((state) => ({
    pendingMutations: [
      ...state.pendingMutations.filter((mutation) => mutation.listId !== listId),
      ...pendingRollback,
    ],
  }));
}

export async function leaveTodoList(listId: string) {
  await ensureListMutationsFlushed(listId);
  const state = useTodos.getState();
  const list = state.lists.find((item) => item.id === listId);
  const pendingRollback = state.pendingMutations.filter(
    (mutation) => mutation.listId === listId,
  );
  const rollback = list
    ? {
        list,
        tasks: state.tasks.filter((task) => task.listId === listId),
        recipes: state.recipes.filter((recipe) => recipe.listId === listId),
        members: state.members.filter((member) => member.listId === listId),
      }
    : undefined;
  useTodos.getState().removeSharedList(listId);
  try {
    const client = await authenticatedClient();
    const { error } = await client.rpc('leave_todo_list', {
      requested_list_id: listId,
    });
    if (error) throw new TodoCollaborationError(error.message);
  } catch (error) {
    restoreSharedListRollback(listId, rollback, pendingRollback);
    throw error;
  }
}

export async function deleteSharedTodoList(listId: string) {
  await ensureListMutationsFlushed(listId);
  const state = useTodos.getState();
  const list = state.lists.find((item) => item.id === listId);
  const pendingRollback = state.pendingMutations.filter(
    (mutation) => mutation.listId === listId,
  );
  const rollback = list
    ? {
        list,
        tasks: state.tasks.filter((task) => task.listId === listId),
        recipes: state.recipes.filter((recipe) => recipe.listId === listId),
        members: state.members.filter((member) => member.listId === listId),
      }
    : undefined;
  useTodos.getState().removeSharedList(listId);
  let client: Awaited<ReturnType<typeof authenticatedClient>>;
  try {
    client = await authenticatedClient();
    const { error } = await client.rpc('delete_todo_list', {
      requested_list_id: listId,
    });
    if (error) throw new TodoCollaborationError(error.message);
  } catch (error) {
    restoreSharedListRollback(listId, rollback, pendingRollback);
    throw error;
  }
  // The list is permanently gone after the RPC succeeds. Storage cleanup is
  // best-effort and must never restore a local ghost list on failure.
  if (rollback?.recipes?.length) {
    await removeSharedRecipeImages(client, rollback.recipes).catch(() => undefined);
  }
}

export function subscribeToTodoList(
  list: Pick<TodoList, 'id'>,
  onChange: () => void,
): RealtimeChannel | undefined {
  const client = getSupabaseClient();
  if (!client) return undefined;
  return client
    .channel(`todo:list:${list.id}`, { config: { private: true } })
    .on('broadcast', { event: 'changed' }, onChange)
    .subscribe();
}
