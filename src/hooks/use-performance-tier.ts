import * as Device from 'expo-device';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/design-system';
import {
  degradePerformanceTier,
  minPerformanceTier,
  performanceGatesFor,
  resolvePerformanceTier,
  type PerformanceGates,
  type PerformanceTier,
} from '@/utils/device-capability';
import { deferAfterPageTransition } from '@/utils/defer-after-page-transition';

/** Session floor shared across features — only ever steps down. */
let sessionFloor: PerformanceTier | null = null;
let floorVersion = 0;
const floorListeners = new Set<() => void>();
let fpsSampleArmed = false;

function subscribeFloor(listener: () => void): () => void {
  floorListeners.add(listener);
  return () => {
    floorListeners.delete(listener);
  };
}

function getFloorVersion(): number {
  return floorVersion;
}

function publishSessionFloor(next: PerformanceTier): void {
  const merged = sessionFloor
    ? minPerformanceTier(sessionFloor, next)
    : next;
  if (merged === sessionFloor) return;
  sessionFloor = merged;
  floorVersion += 1;
  floorListeners.forEach((listener) => listener());
}

/** Test helper — reset session degradation between cases. */
export function resetPerformanceTierSessionForTests(): void {
  sessionFloor = null;
  fpsSampleArmed = false;
  floorVersion += 1;
  floorListeners.forEach((listener) => listener());
}

export type PerformanceTierState = PerformanceGates & {
  /** Raw capability before session floor. */
  capability: PerformanceTier;
  /** Step the whole-app session floor down one notch. */
  degrade: () => void;
};

/**
 * App-wide performance tier from device capability + Reduce Motion, with a
 * shared session floor that can step down after FPS stutter (or manually).
 */
export function usePerformanceTier(): PerformanceTierState {
  const reduceMotion = useReducedMotion();
  useSyncExternalStore(subscribeFloor, getFloorVersion, getFloorVersion);

  const capability = useMemo(
    () =>
      resolvePerformanceTier({
        deviceYearClass: Device.deviceYearClass,
        totalMemory: Device.totalMemory,
        isDevice: Device.isDevice,
        reduceMotion: !!reduceMotion,
        platformOs: Platform.OS,
      }),
    [reduceMotion],
  );

  useEffect(() => {
    publishSessionFloor(capability);
  }, [capability]);

  const tier = minPerformanceTier(sessionFloor ?? capability, capability);
  const gates = performanceGatesFor(tier, Platform.OS);

  const degrade = () => {
    publishSessionFloor(
      degradePerformanceTier(sessionFloor ?? capability),
    );
  };

  // One short FPS sample per session while loops are still allowed.
  useEffect(() => {
    if (fpsSampleArmed) return;
    if (tier === 'static' || tier === 'minimal') return;
    fpsSampleArmed = true;

    let frames = 0;
    let slow = 0;
    let last = 0;
    let raf = 0;
    let samples = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      if (last > 0) {
        const dt = now - last;
        frames += 1;
        if (dt > 34) slow += 1;
      }
      last = now;
      if (frames >= 40) {
        samples += 1;
        const ratio = slow / frames;
        frames = 0;
        slow = 0;
        if (ratio > 0.38) {
          publishSessionFloor(
            degradePerformanceTier(sessionFloor ?? capability),
          );
          return;
        }
        if (samples >= 2) return;
      }
      raf = requestAnimationFrame(tick);
    };

    const cancelStart = deferAfterPageTransition(() => {
      if (!cancelled) raf = requestAnimationFrame(tick);
    }, motion.page + 200);

    return () => {
      cancelled = true;
      cancelStart();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [capability, tier]);

  return {
    ...gates,
    capability,
    degrade,
  };
}

/**
 * Local post-transition gate for mounting loop drivers after a route settle.
 * Combine with `allowsLoopMotion` / feature FX plans.
 */
export function useLiveFxReady(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    return deferAfterPageTransition(() => setReady(true), motion.page + 120);
  }, [enabled]);

  return ready;
}
