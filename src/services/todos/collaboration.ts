import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/services/cloud/supabase';
import {
  prepareRecipeMutationMedia,
  removeSharedRecipeImages,
  resolveSharedRecipeMedia,
  uploadSharedRecipeImage,
} from '@/services/todos/recipe-media';
import {
  normalizeTodoState,
  type TodoInvite,
  type TodoList,
  type TodoSharedSnapshot,
  useTodos,
} from '@/store/todos';

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
): Promise<TodoSharedSnapshot | undefined> {
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

export async function publishTodoList(listId: string): Promise<TodoSharedSnapshot> {
  const state = useTodos.getState();
  const list = state.lists.find((item) => item.id === listId);
  if (!list || list.mode !== 'private' || list.role !== 'owner') {
    throw new TodoCollaborationError('Only a private list owner can share it.');
  }
  const client = await authenticatedClient();
  const recipes = state.recipes.filter((recipe) => recipe.listId === list.id);
  const sharedRecipes = await Promise.all(
    recipes.map(async (recipe) => ({
      ...recipe,
      sourceImagePath: await uploadSharedRecipeImage(client, recipe),
    })),
  );
  const { error } = await client.rpc('publish_todo_list', {
    list_payload: {
      id: list.id,
      name: list.name,
      kind: list.kind,
      recipes: sharedRecipes,
      tasks: state.tasks.filter((task) => task.listId === list.id),
    },
  });
  if (error) {
    throw new TodoCollaborationError(
      messageFrom(error, 'The list could not be shared.'),
    );
  }
  const snapshot = await loadTodoListSnapshot(listId);
  if (!snapshot) throw new TodoCollaborationError('The shared list could not be loaded.');
  return snapshot;
}

function permanentMutationError(message: string) {
  return /no longer have access|only the list owner|assigned to someone else|not a member/i.test(
    message,
  );
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
    let preparedBatch;
    try {
      preparedBatch = await Promise.all(
        batch.map((mutation) => prepareRecipeMutationMedia(client, mutation)),
      );
    } catch {
      return;
    }
    const { data, error } = await client.rpc('apply_todo_mutations', {
      mutations: preparedBatch.map((mutation) => ({
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

    let shouldRetryLater = false;
    const rejectedLists = new Set<string>();
    for (const mutation of batch) {
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
      [...rejectedLists].map((listId) =>
        loadTodoListSnapshot(listId).catch(() => undefined),
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
  await Promise.all(ids.map((id) => loadTodoListSnapshot(id)));
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

export async function leaveTodoList(listId: string) {
  const state = useTodos.getState();
  const list = state.lists.find((item) => item.id === listId);
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
    if (rollback) useTodos.getState().replaceSharedSnapshot(rollback);
    throw error;
  }
}

export async function deleteSharedTodoList(listId: string) {
  const state = useTodos.getState();
  const list = state.lists.find((item) => item.id === listId);
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
    if (rollback?.recipes?.length) {
      await removeSharedRecipeImages(client, rollback.recipes);
    }
    const { error } = await client.rpc('delete_todo_list', {
      requested_list_id: listId,
    });
    if (error) throw new TodoCollaborationError(error.message);
  } catch (error) {
    if (rollback) useTodos.getState().replaceSharedSnapshot(rollback);
    throw error;
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
