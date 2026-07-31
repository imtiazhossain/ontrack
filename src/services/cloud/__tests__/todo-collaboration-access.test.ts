import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('collaborative to-do access contract', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/202607280001_collaborative_todos.sql',
    ),
    'utf8',
  );
  const collaboratorLinkMigration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/202607280002_todo_collaborator_links.sql',
    ),
    'utf8',
  );
  const transferOwnershipMigration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/202607310001_transfer_todo_ownership.sql',
    ),
    'utf8',
  );

  it('keeps shared tables behind RLS and authenticated RPCs', () => {
    for (const table of [
      'todo_lists',
      'todo_list_members',
      'todo_items',
      'todo_email_invites',
      'todo_share_links',
      'todo_mutation_receipts',
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on public.${table} from anon, authenticated`);
    }
    expect(migration).not.toMatch(
      /grant execute on function public\.(publish_todo_list|apply_todo_mutation|accept_todo_share_link)[\s\S]*?to anon/,
    );
  });

  it('stores only a digest for reusable join links', () => {
    const shareTable = migration.match(
      /create table public\.todo_share_links \(([\s\S]*?)\n\);/,
    )?.[1];
    expect(shareTable).toBeDefined();
    expect(shareTable).toContain('token_hash bytea');
    expect(shareTable).not.toMatch(/\bcode\s+text\b/);
    expect(migration).toContain("extensions.digest(generated_code, 'sha256')");
    expect(migration).toContain("extensions.digest(link_code, 'sha256')");
  });

  it('enforces owner management and member assignment at the database boundary', () => {
    expect(migration).toContain("if operation = 'set_completion' then");
    expect(migration).toContain('existing_item.assignee_user_id <> actor');
    expect(migration).toContain('if not public.is_todo_owner(requested_list_id) then');
    expect(migration).toContain("raise exception 'Only the list owner can make that change.'");
  });

  it('adds todos to the account-domain constraint', () => {
    expect(migration).toContain(
      "'addons', 'agents', 'preferences', 'schedule', 'plants', 'travel', 'todos'",
    );
  });

  it('allows owners to transfer ownership to a current member then leave', () => {
    expect(transferOwnershipMigration).toContain(
      'create or replace function public.transfer_todo_list_ownership',
    );
    expect(transferOwnershipMigration).toContain(
      'Ownership can only be transferred to a current member.',
    );
    expect(transferOwnershipMigration).toContain(
      'Transfer ownership first, or delete the list instead.',
    );
    expect(transferOwnershipMigration).toContain(
      'grant execute on function public.transfer_todo_list_ownership(uuid, uuid) to authenticated',
    );
    expect(transferOwnershipMigration).not.toMatch(
      /grant execute on function public\.transfer_todo_list_ownership[\s\S]*?to anon/,
    );
  });

  it('protects multi-checklist collaborator links and stores only token digests', () => {
    for (const table of [
      'todo_collaborator_links',
      'todo_collaborator_link_lists',
    ]) {
      expect(collaboratorLinkMigration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(collaboratorLinkMigration).toContain(
        `revoke all on public.${table} from anon, authenticated`,
      );
    }
    expect(collaboratorLinkMigration).toContain('token_hash bytea not null unique');
    expect(collaboratorLinkMigration).not.toMatch(/\bcode\s+text\b/);
    expect(collaboratorLinkMigration).not.toMatch(
      /grant execute on function public\.(create|resolve|accept)_todo_collaborator_link[\s\S]*?to anon/,
    );
    expect(collaboratorLinkMigration).toContain(
      'You can only invite collaborators to checklists you own.',
    );
  });
});
