import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202607270005_travel_invite_access.sql',
);
const authenticatedOnlyMigrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202607270006_travel_invite_authenticated_only.sql',
);

describe('travel invitation access migration', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  const authenticatedOnlyMigration = fs.readFileSync(
    authenticatedOnlyMigrationPath,
    'utf8',
  );

  it('removes public payload reads and anonymous invitation RPC access', () => {
    expect(migration).toContain(
      'revoke select (code, payload, expires_at) on public.travel_invites',
    );
    expect(migration).toContain(
      'drop policy if exists "anyone reads active travel invites"',
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.(?:create|resolve|accept)_travel_invite[\s\S]*?\bto anon\b/,
    );
    expect(authenticatedOnlyMigration).toContain(
      'revoke execute on function public.resolve_travel_invite(text)',
    );
    expect(authenticatedOnlyMigration).toContain(
      'revoke execute on function public.travel_chat_messages(text)',
    );
    expect(authenticatedOnlyMigration.match(/\sfrom anon;/g)).toHaveLength(8);
  });

  it('resolves invitations only for the signed-in invited email', () => {
    expect(migration).toMatch(
      /create or replace function public\.resolve_travel_invite[\s\S]*?auth\.uid\(\) is not null[\s\S]*?invite\.invitee_email = lower\(coalesce\(auth\.jwt\(\) ->> 'email', ''\)\)/,
    );
  });

  it('limits management to the inviter and chat to accepted members', () => {
    expect(migration).toMatch(
      /create or replace function public\.revoke_travel_invite[\s\S]*?invite\.inviter_user_id = auth\.uid\(\)/,
    );
    expect(migration).toMatch(
      /create or replace function public\.travel_chat_trip_id[\s\S]*?invite\.inviter_user_id = auth\.uid\(\)[\s\S]*?invite\.accepted_by_user_id = auth\.uid\(\)/,
    );
  });
});
