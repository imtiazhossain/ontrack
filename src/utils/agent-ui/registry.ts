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

function frameArea(frame: AgentUiFrame): number {
  return Math.max(0, frame.width) * Math.max(0, frame.height);
}

function frameContains(frame: AgentUiFrame, x: number, y: number): boolean {
  return (
    x >= frame.x &&
    y >= frame.y &&
    x <= frame.x + frame.width &&
    y <= frame.y + frame.height
  );
}

/**
 * Resolve the registered target under a logical window point.
 * Prefers the smallest containing frame (innermost control), then longest testID.
 * Coordinates are for lookup only — always tap by testID afterward.
 */
export function hitAgentUiTarget(
  x: number,
  y: number,
): AgentUiEntry | undefined {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  let best: AgentUiEntry | undefined;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const entry of targets.values()) {
    const frame = entry.frame;
    if (!frame || !frameContains(frame, x, y)) continue;
    const area = frameArea(frame);
    const candidate: AgentUiEntry = {
      testID: entry.testID,
      label: entry.label,
      frame: entry.frame,
      tappable: entry.tappable,
    };
    if (
      !best ||
      area < bestArea ||
      (area === bestArea && candidate.testID.length > best.testID.length)
    ) {
      best = candidate;
      bestArea = area;
    }
  }
  return best;
}

/** All registered targets whose frames contain the point, smallest first. */
export function hitAgentUiTargets(x: number, y: number): AgentUiEntry[] {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  return Array.from(targets.values())
    .filter((entry) => entry.frame && frameContains(entry.frame, x, y))
    .map(({ testID, label, frame, tappable }) => ({
      testID,
      label,
      frame,
      tappable,
    }))
    .sort((a, b) => {
      const areaA = a.frame ? frameArea(a.frame) : Number.POSITIVE_INFINITY;
      const areaB = b.frame ? frameArea(b.frame) : Number.POSITIVE_INFINITY;
      if (areaA !== areaB) return areaA - areaB;
      return b.testID.length - a.testID.length;
    });
}

/** Test helper — clears registry between cases. */
export function resetAgentUiRegistry(): void {
  targets.clear();
}
