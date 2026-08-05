/**
 * __DEV__ agent-ui overlay toggle — paints registered frames + short ids on
 * screen so a screenshot carries the reference point for triage.
 */

type Listener = () => void;

let overlayEnabled = false;
const listeners = new Set<Listener>();

export function isAgentUiOverlayEnabled(): boolean {
  return overlayEnabled;
}

export function setAgentUiOverlayEnabled(enabled: boolean): void {
  if (overlayEnabled === enabled) return;
  overlayEnabled = enabled;
  for (const listener of listeners) listener();
}

export function toggleAgentUiOverlay(): boolean {
  setAgentUiOverlayEnabled(!overlayEnabled);
  return overlayEnabled;
}

export function subscribeAgentUiOverlay(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Short label for overlay chips — last 2–3 segments of the wire id. */
export function agentUiOverlayShortLabel(testID: string): string {
  const raw = testID.startsWith('ontrack.') ? testID.slice('ontrack.'.length) : testID;
  const parts = raw.split('.').filter(Boolean);
  if (parts.length <= 3) return parts.join('.') || testID;
  return parts.slice(-3).join('.');
}
