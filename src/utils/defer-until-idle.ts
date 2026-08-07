import { InteractionManager } from 'react-native';

/** Cap so a stuck interaction handle can't delay navigation/work for seconds. */
const IDLE_FALLBACK_MS = 48;

/**
 * Run work after animations / gestures settle so cold-start UI isn't
 * competing with migrations, notification setup, or similar.
 * Falls back quickly if interactions never clear.
 */
export function deferUntilIdle(task: () => void | Promise<void>): () => void {
  let cancelled = false;
  let settled = false;
  const run = () => {
    if (cancelled || settled) return;
    settled = true;
    void Promise.resolve(task());
  };
  const handle = InteractionManager.runAfterInteractions(run);
  const timer = setTimeout(run, IDLE_FALLBACK_MS);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    handle.cancel?.();
  };
}
