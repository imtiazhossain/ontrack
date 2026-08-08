import type { Href, ImperativeRouter } from 'expo-router';

/**
 * Close / back with a safe fallback.
 *
 * Prefer stack `dismiss` over `router.back()` / `GO_BACK`. Tab-history "back"
 * and empty stacks (agent-ui replace, deep link) otherwise hit Expo Router’s
 * dev-only LogBox: "The action 'GO_BACK' was not handled by any navigator."
 */
export function goBackOrReplace(router: ImperativeRouter, fallback: Href = '/(tabs)') {
  if (router.canDismiss()) {
    router.dismiss(1);
    return;
  }

  router.replace(fallback);
}
