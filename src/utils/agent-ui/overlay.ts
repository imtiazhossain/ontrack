/**
 * __DEV__ agent-ui overlay toggle — paints registered frames + short ids on
 * screen so a screenshot carries the reference point for triage.
 */

type Listener = () => void;

let overlayEnabled = false;
const listeners = new Set<Listener>();

/** Chrome that stays mounted across tabs / stacks — always safe to paint. */
const OVERLAY_GLOBAL_PREFIXES = [
  'ontrack.tabs.',
  'ontrack.chrome.',
  'ontrack.agentUi.',
  'ontrack.prompt.',
] as const;

/**
 * Map the active path to feature id prefixes. Tab screens stay mounted, so
 * without this filter inactive routes leave ghost boxes on the current screen.
 */
export function agentUiOverlayRoutePrefixes(route: string | null | undefined): string[] {
  const path = (route ?? '').split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/') return ['today'];
  const seg = path.replace(/^\//, '').split('/')[0]?.toLowerCase() ?? '';
  switch (seg) {
    case 'profile':
    case 'account':
      return ['profile', 'account'];
    case 'to-do':
    case 'todos':
    case 'l':
    case 'c':
      return ['todos', 'todo', 'checklists', 'grocery', 'recipe'];
    case 'vision-board':
      return ['visionBoard', 'vision-board', 'vision'];
    case 'design-system':
      return ['designSystem', 'design-system'];
    case 'nutrition-profile':
      return ['nutrition', 'profile'];
    case 'activity-form':
      return ['activity', 'today'];
    case 'developer':
      return ['developer'];
    case 'integrations':
      return ['integrations', 'apiUsage', 'developer'];
    case 'travel':
    case 'calendar':
    case 'social':
    case 'insights':
    case 'workouts':
    case 'plants':
    case 'vehicles':
    case 'health':
    case 'games':
    case 'agents':
    case 'privacy':
    case 'terms':
      return [seg];
    default:
      return seg ? [seg] : [];
  }
}

/** Whether the overlay should paint this testID for the active route. */
export function isAgentUiOverlayPaintTarget(
  testID: string,
  route: string | null | undefined,
): boolean {
  if (!testID) return false;
  if (OVERLAY_GLOBAL_PREFIXES.some((prefix) => testID.startsWith(prefix))) {
    return true;
  }
  return agentUiOverlayRoutePrefixes(route).some(
    (prefix) => testID === `ontrack.${prefix}` || testID.startsWith(`ontrack.${prefix}.`),
  );
}

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
