import { listAgentUiTargets, tapAgentUiTarget } from './registry';

/** Sheet / modal chrome that should clear before a fresh land. */
const DISMISS_ID_RE =
  /\.(close|cancel)$|travel\.(currency|weather)\.done$/i;

export function isAgentUiDismissTargetId(testID: string): boolean {
  return DISMISS_ID_RE.test(testID);
}

/**
 * Best-effort: tap registered close/cancel/(sheet) done controls under `prefix`.
 * Always succeeds — used at the start of land flows so leftover sheets do not
 * swallow taps. Caps rounds so a stubborn control cannot loop forever.
 */
export function dismissAgentUiOverlays(prefix = 'ontrack.'): {
  tapped: string[];
  rounds: number;
} {
  const tapped: string[] = [];
  let rounds = 0;
  const maxRounds = 4;
  while (rounds < maxRounds) {
    rounds += 1;
    const candidates = listAgentUiTargets()
      .filter(
        (entry) =>
          entry.tappable &&
          entry.testID.startsWith(prefix) &&
          isAgentUiDismissTargetId(entry.testID),
      )
      .map((entry) => entry.testID)
      .sort((a, b) => b.length - a.length);
    if (candidates.length === 0) break;
    let any = false;
    for (const id of candidates) {
      if (tapAgentUiTarget(id)) {
        tapped.push(id);
        any = true;
      }
    }
    if (!any) break;
  }
  return { tapped, rounds };
}
