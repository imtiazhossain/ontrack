import * as Device from 'expo-device';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/design-system';
import {
  degradeTravelSkyQuality,
  minTravelSkyQuality,
  planTravelSkyFx,
  resolveTravelSkyCapability,
  type TravelSkyFxPlan,
  type TravelSkyQuality,
} from '@/features/travel/travel-sky-quality';
import { deferAfterPageTransition } from '@/utils/defer-after-page-transition';

export type TravelSkyQualityState = {
  plan: TravelSkyFxPlan;
  /** True once post-settle live loops are allowed (still gated by plan.liveFx). */
  liveReady: boolean;
  quality: TravelSkyQuality;
};

/**
 * Device + Reduce Motion starting tier, post-transition live gate, and a short
 * runtime FPS sample that can step the tier down toward a static chrome wash.
 */
export function useTravelSkyQuality(): TravelSkyQualityState {
  const reduceMotion = useReducedMotion();
  const capability = useMemo(
    () =>
      resolveTravelSkyCapability({
        deviceYearClass: Device.deviceYearClass,
        totalMemory: Device.totalMemory,
        isDevice: Device.isDevice,
        reduceMotion: !!reduceMotion,
        platformOs: Platform.OS,
      }),
    [reduceMotion],
  );

  const [floor, setFloor] = useState<TravelSkyQuality>(capability);
  const [liveReady, setLiveReady] = useState(false);
  const degradedRef = useRef(false);

  // Capability can tighten when Reduce Motion toggles on.
  useEffect(() => {
    setFloor((prev) => minTravelSkyQuality(prev, capability));
  }, [capability]);

  useEffect(() => {
    if (floor === 'static' || floor === 'minimal') {
      setLiveReady(false);
      return;
    }
    return deferAfterPageTransition(
      () => setLiveReady(true),
      motion.page + 120,
    );
  }, [floor]);

  // Sample frame pacing after live FX mounts; degrade once if the device stutters.
  useEffect(() => {
    if (!liveReady || floor === 'static' || floor === 'minimal') return;
    if (degradedRef.current) return;

    let frames = 0;
    let slow = 0;
    let last = 0;
    let raf = 0;
    let samples = 0;
    let cancelled = false;
    const maxSamples = 2;

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
          degradedRef.current = true;
          setFloor((prev) => degradeTravelSkyQuality(prev));
          return;
        }
        if (samples >= maxSamples) return;
      }
      raf = requestAnimationFrame(tick);
    };

    const cancelStart = deferAfterPageTransition(() => {
      if (!cancelled) raf = requestAnimationFrame(tick);
    }, 180);

    return () => {
      cancelled = true;
      cancelStart();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [floor, liveReady]);

  const quality = minTravelSkyQuality(floor, capability);
  const basePlan = planTravelSkyFx(quality);
  const plan: TravelSkyFxPlan = {
    ...basePlan,
    liveFx: basePlan.liveFx && liveReady,
    auroraMotion: basePlan.auroraMotion && liveReady,
    cloudDrift: basePlan.cloudDrift && liveReady,
  };

  return { plan, liveReady, quality };
}
