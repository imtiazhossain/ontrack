import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202608020002_travel_trip_expenses.sql',
);

describe('travel trip expenses migration', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  it('creates a shared expenses document with host/member RPCs', () => {
    expect(migration).toContain('create table if not exists public.travel_trip_expenses');
    expect(migration).toContain('publish_travel_trip_expenses');
    expect(migration).toContain('fetch_travel_trip_expenses');
    expect(migration).toContain('fetch_travel_trip_expenses_by_access');
    expect(migration).toContain('is_travel_trip_host');
    expect(migration).toContain('is_travel_trip_member');
    expect(migration).toContain(
      'grant execute on function public.publish_travel_trip_expenses(text, jsonb, jsonb, text, timestamptz) to authenticated',
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.publish_travel_trip_expenses[\s\S]*?\bto anon\b/,
    );
  });

  it('extends resolve_travel_invite with tripId for member hostTripId', () => {
    expect(migration).toContain("jsonb_build_object('tripId', invite.trip_id)");
  });
});
