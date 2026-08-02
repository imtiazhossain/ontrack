import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202608020004_travel_trip_cohosts.sql',
);

describe('travel trip cohosts migration', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  it('stores cohosts and exposes grant/revoke RPCs to authenticated users only', () => {
    expect(migration).toContain('create table if not exists public.travel_trip_cohosts');
    expect(migration).toContain(
      'create or replace function public.grant_travel_trip_cohost(',
    );
    expect(migration).toContain(
      'create or replace function public.revoke_travel_trip_cohost(',
    );
    expect(migration).toContain(
      'create or replace function public.is_travel_trip_manager(requested_trip_id text)',
    );
    expect(migration).toContain(
      'grant execute on function public.grant_travel_trip_cohost(text, uuid) to authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.revoke_travel_trip_cohost(text, uuid) to authenticated',
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.grant_travel_trip_cohost[\s\S]*?\bto anon\b/,
    );
  });

  it('lists cohost role on the trip roster and keeps sole host for transfers', () => {
    expect(migration).toContain("'role', case when is_cohost then 'cohost' else 'member' end");
    expect(migration).toContain('Only the trip host can make someone a co-host.');
    expect(migration).toContain('Only the trip host can transfer host status.');
  });

  it('lets managers invite and decide join requests without becoming inferred hosts', () => {
    expect(migration).toContain('is_travel_trip_manager(normalized_trip)');
    expect(migration).toContain('inviter_id := host_id');
    expect(migration).toContain(
      'Only the trip host or a co-host can decide join requests.',
    );
  });
});
