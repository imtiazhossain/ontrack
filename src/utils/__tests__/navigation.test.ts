import type { ImperativeRouter } from 'expo-router';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { goBackOrReplace } from '@/utils/navigation';

function routerWith({
  canDismiss,
}: {
  canDismiss: boolean;
}) {
  return {
    router: {
      canDismiss: jest.fn(() => canDismiss),
      dismiss: jest.fn(),
      canGoBack: jest.fn(() => false),
      back: jest.fn(),
      replace: jest.fn(),
    } as unknown as ImperativeRouter,
  };
}

describe('goBackOrReplace', () => {
  it('dismisses the stack when a screen can be popped', () => {
    const { router } = routerWith({ canDismiss: true });

    goBackOrReplace(router, '/(tabs)/calendar');

    expect(router.dismiss).toHaveBeenCalledWith(1);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with the fallback when the stack cannot dismiss', () => {
    const { router } = routerWith({ canDismiss: false });

    goBackOrReplace(router, '/(tabs)/calendar');

    expect(router.dismiss).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/calendar');
  });
});

describe('feature route ownership', () => {
  it.each(['profile', 'workouts', 'plants', 'travel', 'vision-board', 'games', 'vehicles'])(
    'keeps /%s in the tab carousel without a duplicate root route',
    (feature) => {
      const appDirectory = join(process.cwd(), 'src/app');

      const rootRoute =
        feature === 'vision-board'
          ? join(appDirectory, feature, 'index.tsx')
          : join(appDirectory, `${feature}.tsx`);
      expect(existsSync(rootRoute)).toBe(false);
      const tabFlat = join(appDirectory, '(tabs)', `${feature}.tsx`);
      const tabNested = join(appDirectory, '(tabs)', feature, 'index.tsx');
      expect(existsSync(tabFlat) || existsSync(tabNested)).toBe(true);
    },
  );

  it('removes the legacy More section from the tab carousel', () => {
    expect(
      existsSync(join(process.cwd(), 'src/app', '(tabs)', 'more.tsx')),
    ).toBe(false);
  });

  it('keeps day selection in the tab navigator instead of a root-stack route', () => {
    const appDirectory = join(process.cwd(), 'src/app');
    const calendarRoute = readFileSync(
      join(appDirectory, '(tabs)', 'calendar.tsx'),
      'utf8',
    );
    const tabsLayout = readFileSync(
      join(appDirectory, '(tabs)', '_layout.tsx'),
      'utf8',
    );

    expect(existsSync(join(appDirectory, 'day', '[date].tsx'))).toBe(false);
    expect(calendarRoute).toContain("router.navigate('/')");
    expect(calendarRoute).not.toContain("router.push({ pathname: '/day/[date]'");
    expect(tabsLayout).toContain(
      "listeners={{ tabPress: () => setSelectedDate(todayKey()) }}",
    );
  });
});

describe('root stack back button', () => {
  it('hides the iOS 26 Liquid Glass background around the custom back control', () => {
    const rootLayout = readFileSync(
      join(process.cwd(), 'src/app', '_layout.tsx'),
      'utf8',
    );

    expect(rootLayout).toContain("type: 'custom' as const");
    expect(rootLayout).toContain('hidesSharedBackground: true');
  });

  it('disables iOS edge-swipe GO_BACK on the tab root', () => {
    const rootLayout = readFileSync(
      join(process.cwd(), 'src/app', '_layout.tsx'),
      'utf8',
    );

    expect(rootLayout).toMatch(
      /name="\(tabs\)"[\s\S]*?gestureEnabled:\s*false/,
    );
  });
});
