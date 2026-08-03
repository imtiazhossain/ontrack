export type AgentUiFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AgentUiEntry = {
  testID: string;
  label?: string;
  frame: AgentUiFrame | null;
  tappable: boolean;
};

type AgentUiTarget = AgentUiEntry & {
  press?: () => void;
};

const targets = new Map<string, AgentUiTarget>();

/** Dev-only agent UI bridge. Production builds no-op. */
export function isAgentUiEnabled(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function registerAgentUiTarget(
  testID: string,
  options: {
    label?: string;
    frame?: AgentUiFrame | null;
    press?: () => void;
  },
): void {
  if (!isAgentUiEnabled() || !testID) return;
  const existing = targets.get(testID);
  targets.set(testID, {
    testID,
    label: options.label ?? existing?.label,
    frame: options.frame !== undefined ? options.frame : (existing?.frame ?? null),
    tappable: Boolean(options.press ?? existing?.press),
    press: options.press ?? existing?.press,
  });
}

export function unregisterAgentUiTarget(testID: string): void {
  if (!testID) return;
  targets.delete(testID);
}

export function listAgentUiTargets(): AgentUiEntry[] {
  return Array.from(targets.values())
    .map(({ testID, label, frame, tappable }) => ({
      testID,
      label,
      frame,
      tappable,
    }))
    .sort((a, b) => a.testID.localeCompare(b.testID));
}

export function getAgentUiTarget(testID: string): AgentUiEntry | undefined {
  const entry = targets.get(testID);
  if (!entry) return undefined;
  return {
    testID: entry.testID,
    label: entry.label,
    frame: entry.frame,
    tappable: entry.tappable,
  };
}

export function tapAgentUiTarget(testID: string): boolean {
  if (!isAgentUiEnabled()) return false;
  const entry = targets.get(testID);
  if (!entry?.press) return false;
  entry.press();
  return true;
}

/** Test helper — clears registry between cases. */
export function resetAgentUiRegistry(): void {
  targets.clear();
}
