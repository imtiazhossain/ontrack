import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/services/cloud/supabase';
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
  };
  const normalized = normalizeTodoState({
    lists: candidate.list ? [candidate.list] : [],
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks : [],
    members: Array.isArray(candidate.members) ? candidate.members : [],
  });
  const list = normalized.lists.find((item) => item.mode === 'shared');
  if (!list) return undefined;
  return {
    list,
    tasks: normalized.tasks.filter((task) => task.listId === list.id),
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
  const snapshot = sharedSnapshot(data);
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
  const { error } = await client.rpc('publish_todo_list', {
    list_payload: {
      id: list.id,
      name: list.name,
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

export async function flushTodoMutations(): Promise<void> {
  const client = await authenticatedClient();
  while (true) {
    const mutation = useTodos.getState().pendingMutations[0];
    if (!mutation) return;
    useTodos.getState().markMutationAttempt(mutation.id);
    const { error } = await client.rpc('apply_todo_mutation', {
      mutation_id: mutation.id,
      requested_list_id: mutation.listId,
      operation: mutation.operation,
      mutation_payload: mutation.payload,
    });
    if (!error) {
      useTodos.getState().acknowledgeMutation(mutation.id);
      continue;
    }

    if (permanentMutationError(error.message)) {
      useTodos.getState().rejectMutation(mutation.id, error.message);
      await loadTodoListSnapshot(mutation.listId).catch(() => undefined);
      continue;
    }
    return;
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
  const client = await authenticatedClient();
  const { error } = await client.rpc('leave_todo_list', {
    requested_list_id: listId,
  });
  if (error) throw new TodoCollaborationError(error.message);
  useTodos.getState().removeSharedList(listId);
}

export async function deleteSharedTodoList(listId: string) {
  const client = await authenticatedClient();
  const { error } = await client.rpc('delete_todo_list', {
    requested_list_id: listId,
  });
  if (error) throw new TodoCollaborationError(error.message);
  useTodos.getState().removeSharedList(listId);
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
