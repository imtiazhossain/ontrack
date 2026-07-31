import { InteractionManager } from 'react-native';

/**
 * Run work after animations / gestures settle so cold-start UI isn't
 * competing with migrations, notification setup, or similar.
 */
export function deferUntilIdle(task: () => void | Promise<void>): () => void {
  let cancelled = false;
  const handle = InteractionManager.runAfterInteractions(() => {
    if (cancelled) return;
    void Promise.resolve(task());
  });
  return () => {
    cancelled = true;
    handle.cancel?.();
  };
}
