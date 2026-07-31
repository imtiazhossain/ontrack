import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('collaborative vehicles access contract', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/202607310002_collaborative_vehicles.sql',
    ),
    'utf8',
  );

  it('keeps shared tables behind RLS and authenticated RPCs', () => {
    for (const table of [
      'vehicles',
      'vehicle_members',
      'vehicle_activity_events',
      'vehicle_share_links',
      'vehicle_mutation_receipts',
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(migration).toContain(
        `revoke all on public.${table} from anon, authenticated`,
      );
    }
    expect(migration).not.toMatch(
      /grant execute on function public\.(publish_vehicle|accept_vehicle_share_link)[\s\S]*?to anon/,
    );
  });

  it('stores only a digest for reusable join links', () => {
    const shareTable = migration.match(
      /create table public\.vehicle_share_links \(([\s\S]*?)\n\);/,
    )?.[1];
    expect(shareTable).toContain('token_hash bytea not null unique');
    expect(shareTable).not.toMatch(/\btoken text\b/);
  });

  it('supports ownership transfer and leave with owner guard', () => {
    expect(migration).toContain('create or replace function public.transfer_vehicle_ownership');
    expect(migration).toContain('Transfer ownership first, or delete the vehicle instead.');
    expect(migration).toContain('Ownership can only be transferred to a current member.');
  });

  it('records activity for shared mutations', () => {
    expect(migration).toContain('create table public.vehicle_activity_events');
    expect(migration).toContain('append_vehicle_activity');
  });

  it('adds vehicles to app_state domains and addon entitlements', () => {
    expect(migration).toContain("'vehicles'");
    expect(migration).toMatch(/addon_id in \([\s\S]*'vehicles'/);
  });
});
