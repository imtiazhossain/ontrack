import type { Href, ImperativeRouter } from 'expo-router';

export function goBackOrReplace(router: ImperativeRouter, fallback: Href = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
