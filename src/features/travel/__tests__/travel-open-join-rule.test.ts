import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202607310003_travel_open_join.sql',
);
const fixMigrationPath = path.join(
  process.cwd(),
  'supabase/migrations/202608020001_fix_travel_open_join_link_code.sql',
);

describe('travel open join migration', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  const fixMigration = fs.readFileSync(fixMigrationPath, 'utf8');

  it('keeps full itinerary payloads private until the host approves', () => {
    expect(migration).toContain('create table if not exists public.travel_open_join_links');
    expect(migration).toContain('create table if not exists public.travel_open_join_requests');
    expect(migration).toContain('revoke all on public.travel_open_join_links from anon, authenticated');
    expect(migration).toMatch(
      /grant execute on function public\.preview_travel_open_join\(text\) to anon, authenticated/,
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.resolve_travel_open_join[\s\S]*?\bto anon\b/,
    );
    expect(migration).toMatch(
      /create or replace function public\.decide_travel_open_join[\s\S]*?Only the trip host can decide join requests/,
    );
    expect(migration).toMatch(
      /create or replace function public\.resolve_travel_open_join[\s\S]*?The trip host has not approved your join request yet/,
    );
  });

  it('aliases link_code to avoid PL/pgSQL column ambiguity', () => {
    for (const sql of [migration, fixMigration]) {
      expect(sql).toContain('v_link_code text := link_code');
      expect(sql).toContain('where request.link_code = v_link_code');
    }
  });
});
