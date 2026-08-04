import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('health privacy boundary', () => {
  it('does not register health as a cloud-sync domain', () => {
    const sync = readFileSync(join(process.cwd(), 'src/services/cloud/sync.ts'), 'utf8');
    expect(sync).not.toContain("name: 'health'");
    expect(sync).not.toContain('useHealth');
  });

  it('adds only the health entitlement, not a health app-state domain', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/202608040002_health_addon_entitlement.sql'), 'utf8');
    expect(migration).toContain("'health'");
    expect(migration).not.toContain('app_state_domain_check');
    expect(migration).not.toContain('create table');
  });
});
