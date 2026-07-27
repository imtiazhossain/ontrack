import { existsSync } from 'node:fs';
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
  it.each(['plants', 'travel'])(
    'keeps /%s in the root stack without a duplicate tab-group route',
    (feature) => {
      const appDirectory = join(process.cwd(), 'src/app');

      expect(existsSync(join(appDirectory, `${feature}.tsx`))).toBe(true);
      expect(existsSync(join(appDirectory, '(tabs)', `${feature}.tsx`))).toBe(false);
    },
  );
});
