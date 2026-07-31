import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('vision board cloud schema', () => {
  it('allows the sync domain and add-on entitlement in the deployment migration', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/202607290002_vision_board.sql'),
      'utf8',
    );
    expect(migration).toContain("'vision-board'");
    expect(migration).toContain('app_state_domain_check');
    expect(migration).toContain('addon_entitlements_addon_id_check');
  });
});
