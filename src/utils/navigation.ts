import type { Href, ImperativeRouter } from 'expo-router';

/**
 * Close / back with a safe fallback.
 *
 * Prefer `dismissTo(fallback)` over blind stack `POP` / `GO_BACK`.
 * Empty-stack pops hit Expo Router’s dev-only LogBox when the focused stack
 * can’t pop (index === 0) — iOS and Android (agent-ui replace, deep link,
 * empty tab root). `dismissTo` pops when the href is in history; otherwise
 * it swaps the current screen for the fallback.
 */
export function goBackOrReplace(router: ImperativeRouter, fallback: Href = '/') {
  router.dismissTo(fallback);
}
