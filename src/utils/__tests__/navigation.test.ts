import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ImperativeRouter } from 'expo-router';

import { goBackOrReplace } from '@/utils/navigation';

function routerWith(canGoBack: boolean) {
  return {
    router: {
      canGoBack: jest.fn(() => canGoBack),
      back: jest.fn(),
      replace: jest.fn(),
    } as unknown as ImperativeRouter,
  };
}

describe('goBackOrReplace', () => {
  it('goes back when navigation history exists', () => {
    const { router } = routerWith(true);

    goBackOrReplace(router, '/(tabs)/calendar');

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with the fallback when the screen is the root route', () => {
    const { router } = routerWith(false);

    goBackOrReplace(router, '/(tabs)/calendar');

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/calendar');
  });
});

describe('feature route ownership', () => {
  it.each(['profile', 'workouts', 'plants', 'travel', 'vision-board', 'games'])(
    'keeps /%s in the tab carousel without a duplicate root route',
    (feature) => {
      const appDirectory = join(process.cwd(), 'src/app');

      const rootRoute =
        feature === 'vision-board'
          ? join(appDirectory, feature, 'index.tsx')
          : join(appDirectory, `${feature}.tsx`);
      expect(existsSync(rootRoute)).toBe(false);
      const tabRoute =
        feature === 'vision-board'
          ? join(appDirectory, '(tabs)', feature, 'index.tsx')
          : join(appDirectory, '(tabs)', `${feature}.tsx`);
      expect(existsSync(tabRoute)).toBe(true);
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
    expect(calendarRoute).toContain("router.navigate('/(tabs)')");
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
});
