import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('authentication navigation invariants', () => {
  const rootLayout = readFileSync(join(process.cwd(), 'src/app/_layout.tsx'), 'utf8');
  const tabsLayout = readFileSync(
    join(process.cwd(), 'src/app/(tabs)/_layout.tsx'),
    'utf8',
  );

  it('keeps the OAuth callback outside protected route groups', () => {
    expect(rootLayout).toContain('name="auth/callback"');
    const protectedGroups = rootLayout.match(/<Stack\.Protected[\s\S]*?<\/Stack\.Protected>/g) ?? [];
    expect(protectedGroups.every((group) => !group.includes('name="auth/callback"'))).toBe(true);
  });

  it('protects welcome, conflict resolution, and app routes with distinct guards', () => {
    expect(rootLayout).toContain('<Stack.Protected guard={welcomeAccess}>');
    expect(rootLayout).toContain("<Stack.Protected guard={phase === 'resolving-data'}>");
    expect(rootLayout).toContain('<Stack.Protected guard={appAccess}>');
  });

  it('keeps every user-facing app route in the authenticated-or-guest group', () => {
    const appGroup = rootLayout.match(
      /<Stack\.Protected guard=\{appAccess\}>([\s\S]*?)<\/Stack\.Protected>/,
    )?.[1];
    expect(appGroup).toBeDefined();
    for (const route of [
      '(tabs)',
      'account',
      'onboarding',
      'agents',
      'nutrition-profile',
      'travel',
    ]) {
      expect(appGroup).toContain(`name="${route}"`);
    }
    for (const route of [
      'profile',
      'workouts',
      'plants',
      'travel',
      'vision-board',
      'games',
      'vehicles',
    ]) {
      expect(tabsLayout).toContain(`<Tabs.Screen name="${route}"`);
    }
  });

  it('holds the static loading shell until hydration and account resolution finish', () => {
    expect(rootLayout).toContain("if (!hydrated || phase === 'loading')");
    expect(rootLayout).toContain('LoadingBlock');
    expect(rootLayout).toContain('SplashScreen');
    expect(rootLayout.indexOf("if (!hydrated || phase === 'loading')")).toBeLessThan(
      rootLayout.indexOf('<Stack'),
    );
  });

  it('waits for vision board and health persistence before releasing the loading shell', () => {
    const hydrated = readFileSync(
      join(process.cwd(), 'src/hooks/use-hydrated.ts'),
      'utf8',
    );
    expect(hydrated).toContain("from '@/store/vision-board'");
    expect(hydrated).toContain('useVisionBoard.persist.rehydrate()');
    expect(hydrated).toContain('useHealth.persist.rehydrate()');
    // Never seal while rehydrates are still in flight (no timeout escape hatch).
    expect(hydrated).not.toContain('setTimeout(release');
    expect(hydrated).not.toContain('HYDRATION_TIMEOUT_MS');
    expect(hydrated).not.toContain('Promise.race');
  });

  it('keeps hydration sticky across Fast Refresh remounts without sealing aborted boots', () => {
    const hydrated = readFileSync(
      join(process.cwd(), 'src/hooks/use-hydrated.ts'),
      'utf8',
    );
    expect(hydrated).toContain('sessionHydrated');
    expect(hydrated).toContain('useState(sessionHydrated)');
    expect(hydrated).toContain('if (!active) return');
  });

  it('restores the selected section after a Fast Refresh stack remount', () => {
    expect(rootLayout).toContain('NavigationSessionSync');
    const authProvider = readFileSync(
      join(process.cwd(), 'src/features/auth/auth-provider.tsx'),
      'utf8',
    );
    expect(authProvider).toContain('sessionAuthSnapshot');
    expect(authProvider).toContain("sessionAuthSnapshot?.phase ?? 'loading'");
  });

  it('does not demote sticky auth phases on getSession timeout', () => {
    const authProvider = readFileSync(
      join(process.cwd(), 'src/features/auth/auth-provider.tsx'),
      'utf8',
    );
    expect(authProvider).toContain("current === 'resolving-data'");
    expect(authProvider).toContain("phase === 'guest' || phase === 'authenticated' || phase === 'resolving-data'");
  });

  it('keeps guest dirty tracking through auth-upgrade phases', () => {
    const authProvider = readFileSync(
      join(process.cwd(), 'src/features/auth/auth-provider.tsx'),
      'utf8',
    );
    expect(authProvider).toContain("!guestEnabled || phase === 'authenticated' || phase === 'welcome'");
    expect(authProvider).toContain('useVehicles.subscribe(mark)');
  });

  it('gates app routes on settled guest or authenticated phases only', () => {
    expect(rootLayout).toContain("phase === 'authenticated' || phase === 'guest'");
  });
});
