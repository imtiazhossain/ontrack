/** Shared selection for stacked safe-area chrome / overlay registrants. */

export type RankedEntry = {
  priority: number;
  seq: number;
};

/** Highest priority wins; ties break to the later registration (`seq`). */
export function pickRankedEntry<T extends RankedEntry>(entries: T[]): T | undefined {
  if (entries.length === 0) return undefined;
  let best = entries[0]!;
  for (let i = 1; i < entries.length; i += 1) {
    const next = entries[i]!;
    if (
      next.priority > best.priority ||
      (next.priority === best.priority && next.seq > best.seq)
    ) {
      best = next;
    }
  }
  return best;
}
