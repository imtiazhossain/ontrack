import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    canUseDeveloperTools,
    hasDeveloperToolsFlag,
} from '@/features/account/dev-access';
import { useAccountFlags } from '@/store/account-flags';

describe('dev-access', () => {
  beforeEach(() => {
    useAccountFlags.getState().reset();
  });

  it('denies developer tools until the server flag is granted', () => {
    expect(hasDeveloperToolsFlag()).toBe(false);
    expect(canUseDeveloperTools()).toBe(false);

    useAccountFlags.getState().replaceFlags({
      developerTools: true,
      analyticsAdmin: false,
    });
    expect(hasDeveloperToolsFlag()).toBe(true);
    expect(canUseDeveloperTools()).toBe(true);
  });

  it('allows developer tools in non-__DEV__ builds when the server flag is set', () => {
    const originalDev = (global as { __DEV__?: boolean }).__DEV__;
    try {
      useAccountFlags.getState().replaceFlags({
        developerTools: true,
        analyticsAdmin: false,
      });
      (global as { __DEV__?: boolean }).__DEV__ = false;
      expect(canUseDeveloperTools()).toBe(true);
    } finally {
      (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    }
  });

  it('keeps emails out of the client gate and uses DevAccessGate on routes', () => {
    const access = readFileSync(
      join(process.cwd(), 'src/features/account/dev-access.ts'),
      'utf8',
    );
    expect(access).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(access).not.toContain('EXPO_PUBLIC_DEV_ACCESS_EMAILS');
    expect(access).toContain('account_flags');

    const profile = readFileSync(join(process.cwd(), 'src/app/(tabs)/profile/index.tsx'), 'utf8');
    expect(profile).toContain('useCanUseDeveloperTools');
    expect(profile).not.toMatch(/\{__DEV__\s*\?/);

    for (const route of [
      'src/app/(tabs)/profile/developer.tsx',
      'src/app/(tabs)/profile/integrations.tsx',
      'src/app/(tabs)/profile/design-system.tsx',
      'src/app/(tabs)/profile/api-usage.tsx',
    ]) {
      const source = readFileSync(join(process.cwd(), route), 'utf8');
      expect(source).toContain('DevAccessGate');
    }
  });

  it('stores account flags in a migration without client email allowlists', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/202608050009_account_flags.sql'),
      'utf8',
    );
    expect(migration).toContain('create table if not exists public.account_flags');
    expect(migration).toContain('developer_tools');
    expect(migration).toContain('analytics_admin');
    expect(migration).toContain('from public.account_flags');
    expect(migration).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
});
