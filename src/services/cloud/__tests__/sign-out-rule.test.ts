import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('current-device sign-out invariants', () => {
  const provider = readFileSync(
    join(process.cwd(), 'src/features/auth/auth-provider.tsx'),
    'utf8',
  );
  const account = readFileSync(join(process.cwd(), 'src/services/cloud/account.ts'), 'utf8');
  const sync = readFileSync(join(process.cwd(), 'src/services/cloud/sync.ts'), 'utf8');

  it('flushes before local-scope sign-out and supports an explicit forced discard', () => {
    expect(provider).toContain('if (!force)');
    expect(provider).toContain('await flushCloudSync()');
    expect(provider).toContain("status: 'sync-failed'");
    expect(account).toContain("signOut({ scope: 'local' })");
  });

  it('cleans every synced domain, nutrition memory, notifications, and app-owned media', () => {
    for (const domain of ['addons', 'agents', 'preferences', 'schedule', 'plants', 'travel', 'todos']) {
      expect(sync).toContain(`name: '${domain}'`);
    }
    expect(sync).toContain('useNutrition.getState().reset()');
    expect(sync).toContain('deletePlant(plant.id)');
    expect(sync).toContain("['plants', 'meal-images']");
  });

  it('does not delete cloud rows or system photo-library originals during sign-out cleanup', () => {
    const cleanup = sync.slice(sync.indexOf('export async function clearLocalAccountData'));
    expect(cleanup).not.toContain(".from('app_state').delete()");
    expect(cleanup).not.toContain('MediaLibrary');
  });
});
