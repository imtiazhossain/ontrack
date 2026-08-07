import { motion } from '@/design-system';

/**
 * Run work after the native stack push/pop settle (`motion.page`).
 * Prefer this over `deferUntilIdle` when the work would compete with a
 * page transition — idle fallbacks can fire mid-animation (~48ms).
 */
export function deferAfterPageTransition(
  task: () => void | Promise<void>,
  delayMs: number = motion.page,
): () => void {
  let cancelled = false;
  const timer = setTimeout(() => {
    if (cancelled) return;
    void Promise.resolve(task());
  }, delayMs);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
