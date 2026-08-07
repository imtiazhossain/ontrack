import { router, type Href } from 'expo-router';

import { deferAfterPageTransition } from '@/utils/defer-after-page-transition';

const warmedKeys = new Set<string>();

function hrefKey(href: Href): string {
  return typeof href === 'string' ? href : JSON.stringify(href);
}

/** Prefetch a route once — no-ops if already warmed this session. */
export function warmHref(href: Href): boolean {
  const key = hrefKey(href);
  if (warmedKeys.has(key)) return false;
  warmedKeys.add(key);
  try {
    router.prefetch(href);
    return true;
  } catch {
    warmedKeys.delete(key);
    return false;
  }
}

/**
 * Stagger route prefetches after the current page transition so taps feel
 * instant without spiking the JS thread on land.
 */
export function warmHrefsAfterTransition(
  hrefs: Href[],
  gapMs = 140,
): () => void {
  const unique = hrefs.filter((href, index, list) => {
    const key = hrefKey(href);
    return list.findIndex((item) => hrefKey(item) === key) === index;
  });
  let cancelled = false;
  let index = 0;
  let gapTimer: ReturnType<typeof setTimeout> | undefined;
  const cancelTransition = deferAfterPageTransition(() => {
    const step = () => {
      if (cancelled || index >= unique.length) return;
      warmHref(unique[index]!);
      index += 1;
      if (index < unique.length) {
        gapTimer = setTimeout(step, gapMs);
      }
    };
    step();
  });
  return () => {
    cancelled = true;
    cancelTransition();
    if (gapTimer) clearTimeout(gapTimer);
  };
}

/** Test helper — clears the session warm cache. */
export function resetWarmNavigationForTests(): void {
  warmedKeys.clear();
}
