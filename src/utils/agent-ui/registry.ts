import type { View } from 'react-native';

import { isAgentUiOverlayEnabled } from './overlay';

export type AgentUiFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AgentUiEntry = {
  testID: string;
  label?: string;
  /** Live control value (e.g. Input text) for --contains asserts. */
  value?: string;
  frame: AgentUiFrame | null;
  tappable: boolean;
};

type AgentUiTarget = AgentUiEntry & {
  press?: () => void;
  /** Native view for in-app scroll-into-view (never host mouse). */
  node?: View | null;
};

type FrameListener = () => void;

const targets = new Map<string, AgentUiTarget>();
const frameListeners = new Set<FrameListener>();
let framesEpoch = 0;

function framesEqual(a: AgentUiFrame | null | undefined, b: AgentUiFrame | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function notifyFramesChanged(): void {
  framesEpoch += 1;
  for (const listener of frameListeners) listener();
}

/** Subscribe to window-frame updates (overlay re-renders after scroll remeasure). */
export function subscribeAgentUiFrames(listener: FrameListener): () => void {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}

export function getAgentUiFramesEpoch(): number {
  return framesEpoch;
}

/** Dev-only agent UI bridge. Production builds no-op. */
export function isAgentUiEnabled(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function registerAgentUiTarget(
  testID: string,
  options: {
    label?: string;
    value?: string;
    frame?: AgentUiFrame | null;
    press?: () => void;
    node?: View | null;
  },
): void {
  if (!isAgentUiEnabled() || !testID) return;
  const existing = targets.get(testID);
  const nextFrame =
    options.frame !== undefined ? options.frame : (existing?.frame ?? null);
  const frameChanged = options.frame !== undefined && !framesEqual(existing?.frame, nextFrame);
  targets.set(testID, {
    testID,
    label: options.label ?? existing?.label,
    value: options.value !== undefined ? options.value : existing?.value,
    frame: nextFrame,
    tappable: Boolean(options.press ?? existing?.press),
    press: options.press ?? existing?.press,
    node: options.node !== undefined ? options.node : (existing?.node ?? null),
  });
  // Overlay is the only live consumer of frame churn; skip notifies when off.
  if (frameChanged && isAgentUiOverlayEnabled()) notifyFramesChanged();
}

/** Internal: view node used by scroll-into-view. */
export function getAgentUiTargetNode(testID: string): View | null {
  return targets.get(testID)?.node ?? null;
}

export function unregisterAgentUiTarget(testID: string): void {
  if (!testID) return;
  if (!targets.has(testID)) return;
  targets.delete(testID);
  if (isAgentUiOverlayEnabled()) notifyFramesChanged();
}

/**
 * Refresh window frames for every registered node. Call after scroll/layout
 * changes — `onLayout` does not fire when a ScrollView moves content.
 */
export function remeasureAllAgentUiFrames(): number {
  if (!isAgentUiEnabled()) return 0;
  let count = 0;
  for (const entry of targets.values()) {
    const node = entry.node;
    if (!node?.measureInWindow) continue;
    count += 1;
    const { testID, label, value, press } = entry;
    node.measureInWindow((x, y, width, height) => {
      // Target may have unmounted between schedule and callback.
      if (!targets.has(testID)) return;
      registerAgentUiTarget(testID, {
        label,
        value,
        press,
        node,
        frame: { x, y, width, height },
      });
    });
  }
  return count;
}

export function listAgentUiTargets(): AgentUiEntry[] {
  return Array.from(targets.values())
    .map(({ testID, label, value, frame, tappable }) => ({
      testID,
      label,
      ...(value !== undefined ? { value } : {}),
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
    ...(entry.value !== undefined ? { value: entry.value } : {}),
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
  framesEpoch = 0;
  try {
    // Lazy import avoids a hard cycle with scroll-container at module init.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./scroll-container').resetAgentUiScrollContainer();
  } catch {
    /* optional in unit tests that only mock registry */
  }
}
