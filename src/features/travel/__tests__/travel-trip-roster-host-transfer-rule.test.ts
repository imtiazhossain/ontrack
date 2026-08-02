import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202608020003_travel_trip_roster_host_transfer.sql',
);

describe('travel trip roster + host transfer migration', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  it('exposes roster and transfer RPCs to authenticated users only', () => {
    expect(migration).toContain(
      'create or replace function public.list_travel_trip_roster(requested_trip_id text)',
    );
    expect(migration).toContain(
      'create or replace function public.transfer_travel_trip_host(',
    );
    expect(migration).toContain(
      'create or replace function public.leave_travel_trip(requested_trip_id text)',
    );
    expect(migration).toContain(
      'grant execute on function public.list_travel_trip_roster(text) to authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.transfer_travel_trip_host(text, uuid) to authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.transfer_travel_trip_host_by_invite(text, text) to authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.leave_travel_trip(text) to authenticated',
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.list_travel_trip_roster[\s\S]*?\bto anon\b/,
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.transfer_travel_trip_host[\s\S]*?\bto anon\b/,
    );
  });

  it('remaps shared expense self/member ids when transferring host', () => {
    expect(migration).toContain('remap_travel_trip_expense_snapshot');
    expect(migration).toContain("when person_id = 'self' then 'member:' || old_host_user_id::text");
    expect(migration).toContain(
      "when person_id = 'member:' || new_host_user_id::text then 'self'",
    );
    expect(migration).toContain('formerHostInviteCode');
  });

  it('keeps the former host as an accepted member after transfer', () => {
    expect(migration).toContain('accepted_by_user_id = old_host');
    expect(migration).toContain(
      'Transfer host status first, or delete the trip instead.',
    );
  });
});
