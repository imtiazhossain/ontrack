import {
  useLiveFxReady,
  usePerformanceTier,
} from '@/hooks/use-performance-tier';
import {
  planTravelSkyFx,
  type TravelSkyFxPlan,
  type TravelSkyQuality,
} from '@/features/travel/travel-sky-quality';

export type TravelSkyQualityState = {
  plan: TravelSkyFxPlan;
  /** True once post-settle live loops are allowed (still gated by plan.liveFx). */
  liveReady: boolean;
  quality: TravelSkyQuality;
};

/**
 * Itinerary sky plan on top of the app-wide performance tier.
 * Live loop drivers wait for the route settle gate.
 */
export function useTravelSkyQuality(): TravelSkyQualityState {
  const { tier, allowsSensors, allowsLoopMotion } = usePerformanceTier();
  const quality = tier;
  const liveReady = useLiveFxReady(
    allowsLoopMotion && (quality === 'full' || quality === 'reduced'),
  );
  const basePlan = planTravelSkyFx(quality);
  const plan: TravelSkyFxPlan = {
    ...basePlan,
    tilt: basePlan.tilt && allowsSensors,
    liveFx: basePlan.liveFx && liveReady,
    auroraMotion: basePlan.auroraMotion && liveReady,
    cloudDrift: basePlan.cloudDrift && liveReady,
    twinkle: basePlan.twinkle && liveReady,
    birds: basePlan.birds && liveReady,
    meteors: basePlan.meteors && liveReady,
    satellites: basePlan.satellites && liveReady,
    weatherFx: basePlan.weatherFx && liveReady,
    heatFog: basePlan.heatFog && liveReady,
    sunRays: basePlan.sunRays && liveReady,
  };

  return { plan, liveReady, quality };
}
