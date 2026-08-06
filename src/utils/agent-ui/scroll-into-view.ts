import type { View } from 'react-native';

import {
  getAgentUiTargetNode,
  isAgentUiEnabled,
  listAgentUiTargets,
  registerAgentUiTarget,
} from './registry';
import { getAgentUiScrollContainer } from './scroll-container';

const EDGE_PAD = 24;
const SETTLE_MS = 48;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function measureInWindow(
  view: Pick<View, 'measureInWindow'>,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      view.measureInWindow((x, y, width, height) => {
        if (
          ![x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))
        ) {
          resolve(null);
          return;
        }
        resolve({ x, y, width, height });
      });
    } catch {
      resolve(null);
    }
  });
}

async function refreshRegisteredFrames(): Promise<void> {
  await Promise.all(
    listAgentUiTargets().map(async (entry) => {
      const node = getAgentUiTargetNode(entry.testID);
      if (!node) return;
      const frame = await measureInWindow(node);
      if (frame) registerAgentUiTarget(entry.testID, { frame });
    }),
  );
}

/**
 * Scroll the active Screen ScrollView so `testID` is in view.
 * Purely in-app — never uses host mouse / Simulator window coordinates.
 */
export async function scrollAgentUiTargetIntoView(testID: string): Promise<boolean> {
  if (!isAgentUiEnabled() || !testID) return false;

  const node = getAgentUiTargetNode(testID);
  const scroll = getAgentUiScrollContainer();
  if (!node || !scroll) return false;

  const target = await measureInWindow(node);
  const viewport = await measureInWindow({
    measureInWindow: (cb) => scroll.measureInWindow(cb),
  });
  if (!target || !viewport) return false;

  const visibleTop = viewport.y + EDGE_PAD;
  const visibleBottom = viewport.y + viewport.height - EDGE_PAD;
  const targetTop = target.y;
  const targetBottom = target.y + target.height;

  let delta = 0;
  if (targetBottom > visibleBottom) {
    delta = targetBottom - visibleBottom;
  } else if (targetTop < visibleTop) {
    delta = targetTop - visibleTop;
  }

  if (Math.abs(delta) >= 1) {
    const nextY = Math.max(0, scroll.getOffsetY() + delta);
    scroll.scrollView.scrollTo({ y: nextY, animated: false });
    await sleep(SETTLE_MS);
  }

  await refreshRegisteredFrames();
  return true;
}
