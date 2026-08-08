/** Pure carousel position math for the bottom nav rail (JS-thread). */

export function canonicalPositionForRoute(index: number, routeCount: number) {
  if (routeCount <= 0) return 0;
  const signedIndex = index > routeCount / 2 ? index - routeCount : index;
  return -signedIndex;
}

/** Route centered at a given carousel position. */
export function routeIndexForPosition(position: number, routeCount: number) {
  if (routeCount <= 0) return 0;
  const rounded = Math.round(position);
  return ((-rounded % routeCount) + routeCount) % routeCount;
}

/**
 * Shortest linear position that centers `routeIndex` without scrolling the long
 * way around the repeating track (avoids multi-lap “fast scroll” glitches).
 */
export function shortestTargetPosition(
  currentPosition: number,
  routeIndex: number,
  routeCount: number,
) {
  if (routeCount <= 0) return currentPosition;
  const current = Math.round(currentPosition);
  const currentRoute = routeIndexForPosition(current, routeCount);
  // Position increases when the centered route index decreases (P ≡ -R).
  let step = currentRoute - routeIndex;
  if (step > routeCount / 2) step -= routeCount;
  if (step < -routeCount / 2) step += routeCount;
  return current + step;
}

/** Rebase into the canonical numeric range without changing what’s on screen. */
export function rebasePosition(
  currentPosition: number,
  routeIndex: number,
  routeCount: number,
) {
  if (routeCount <= 0) return currentPosition;
  const short = shortestTargetPosition(
    currentPosition,
    routeIndex,
    routeCount,
  );
  const canonical = canonicalPositionForRoute(routeIndex, routeCount);
  const circles = Math.round((short - canonical) / routeCount);
  return short - circles * routeCount;
}

/**
 * Which route index the rail should keep centered after a recency reshuffle.
 * Prefer the optimistic pending tap over `selected` — chasing the still-focused
 * prior tab into its new side slot scrolls (+1/−1) then snaps back to 0.
 */
export function centerIndexForRail(
  routes: readonly { name: string }[],
  pendingRouteName: string | null | undefined,
  selectedRouteName: string | null | undefined,
): number {
  const name = pendingRouteName ?? selectedRouteName;
  if (!name) return 0;
  const index = routes.findIndex((route) => route.name === name);
  return index < 0 ? 0 : index;
}
