/** Pure tab-order helpers for the bottom-nav carousel. */

/** Cold-start / never-visited fallback — matches `(tabs)/_layout` screen order. */
export const DEFAULT_TAB_ORDER = [
  '(today)',
  'calendar',
  'to-do',
  'social',
  'insights',
  'profile',
  'workouts',
  'plants',
  'travel',
  'vision-board',
  'games',
  'vehicles',
  'health',
] as const;

const DEFAULT_INDEX = new Map<string, number>(
  DEFAULT_TAB_ORDER.map((name, index) => [name, index]),
);

function defaultRank(routeName: string): number {
  return DEFAULT_INDEX.get(routeName) ?? Number.MAX_SAFE_INTEGER;
}

/** Higher `lastFocusedAt` first; never-used falls back to DEFAULT_TAB_ORDER. */
export function compareTabsByRecency(
  a: string,
  b: string,
  lastFocusedAt: Readonly<Record<string, number>>,
): number {
  const focusedA = lastFocusedAt[a];
  const focusedB = lastFocusedAt[b];
  const hasA = typeof focusedA === 'number' && Number.isFinite(focusedA);
  const hasB = typeof focusedB === 'number' && Number.isFinite(focusedB);

  if (hasA && hasB && focusedA !== focusedB) {
    return focusedB - focusedA;
  }
  if (hasA !== hasB) {
    return hasA ? -1 : 1;
  }

  const rankCmp = defaultRank(a) - defaultRank(b);
  if (rankCmp !== 0) return rankCmp;
  return a.localeCompare(b);
}

/**
 * Rank most-recent first, then fan out around index 0 for the carousel:
 * center = active (ranked[0]), left = previous (ranked[1]), right = second-prior
 * (ranked[2]), then keep alternating left/right.
 *
 * A plain most-recent→least-recent ring would put the least-used tab on the
 * left of center (circular wrap).
 */
export function orderRoutesByRecency<T extends { name: string }>(
  routes: readonly T[],
  lastFocusedAt: Readonly<Record<string, number>>,
): T[] {
  const ranked = [...routes].sort((a, b) =>
    compareTabsByRecency(a.name, b.name, lastFocusedAt),
  );
  return fanOutAroundMostRecent(ranked);
}

/**
 * Place ranked[0] at center index 0.
 * Carousel left of center is index n-1; right is index 1 — so assign
 * ranked[1], ranked[2], … alternating left then right.
 */
export function fanOutAroundMostRecent<T>(ranked: readonly T[]): T[] {
  const n = ranked.length;
  if (n <= 2) return [...ranked];
  const arranged: T[] = new Array(n);
  arranged[0] = ranked[0];
  let right = 1;
  let left = n - 1;
  for (let i = 1; i < n; i++) {
    if (i % 2 === 1) {
      arranged[left--] = ranked[i];
    } else {
      arranged[right++] = ranked[i];
    }
  }
  return arranged;
}
