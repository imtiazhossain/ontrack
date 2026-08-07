import type { PerformanceTier } from '@/utils/device-capability';
import {
  degradePerformanceTier,
  minPerformanceTier,
  performanceTierRank,
  resolvePerformanceTier,
  type DeviceCapabilityInput,
} from '@/utils/device-capability';

/**
 * Itinerary sky fidelity ladder (alias of the app-wide performance tier).
 * Degrades from full motion → static chrome wash so weak devices stay open.
 */
export type TravelSkyQuality = PerformanceTier;

export type TravelSkyFxPlan = {
  quality: TravelSkyQuality;
  /** Mount loop drivers after settle (false for minimal/static). */
  liveFx: boolean;
  tilt: boolean;
  twinkle: boolean;
  /** Cap independently twinkling bright stars (rest stay static SVG). */
  twinkleMax: number;
  birds: boolean;
  meteors: boolean;
  satellites: boolean;
  weatherFx: boolean;
  rainDropMax: number;
  auroraMotion: boolean;
  cloudDrift: boolean;
  sunRays: boolean;
  heatFog: boolean;
  ground: boolean;
  /** 0…1 multiplier for dim field star count. */
  dimStarScale: number;
};

export type TravelSkyCapabilityInput = DeviceCapabilityInput;

export const degradeTravelSkyQuality = degradePerformanceTier;
export const travelSkyQualityRank = performanceTierRank;
export const minTravelSkyQuality = minPerformanceTier;
export const resolveTravelSkyCapability = resolvePerformanceTier;

/** Map a quality tier to concrete itinerary sky FX switches. */
export function planTravelSkyFx(quality: TravelSkyQuality): TravelSkyFxPlan {
  switch (quality) {
    case 'static':
      return {
        quality,
        liveFx: false,
        tilt: false,
        twinkle: false,
        twinkleMax: 0,
        birds: false,
        meteors: false,
        satellites: false,
        weatherFx: false,
        rainDropMax: 0,
        auroraMotion: false,
        cloudDrift: false,
        sunRays: false,
        heatFog: false,
        ground: false,
        dimStarScale: 0,
      };
    case 'minimal':
      return {
        quality,
        liveFx: false,
        tilt: false,
        twinkle: false,
        twinkleMax: 0,
        birds: false,
        meteors: false,
        satellites: false,
        weatherFx: false,
        rainDropMax: 0,
        auroraMotion: false,
        cloudDrift: false,
        sunRays: false,
        heatFog: false,
        ground: true,
        dimStarScale: 0.55,
      };
    case 'reduced':
      return {
        quality,
        liveFx: true,
        tilt: false,
        twinkle: true,
        twinkleMax: 10,
        birds: false,
        meteors: false,
        satellites: false,
        weatherFx: true,
        rainDropMax: 8,
        auroraMotion: false,
        cloudDrift: true,
        sunRays: true,
        heatFog: false,
        ground: true,
        dimStarScale: 0.7,
      };
    default:
      return {
        quality: 'full',
        liveFx: true,
        tilt: true,
        twinkle: true,
        twinkleMax: 48,
        birds: true,
        meteors: true,
        satellites: true,
        weatherFx: true,
        rainDropMax: 17,
        auroraMotion: true,
        cloudDrift: true,
        sunRays: true,
        heatFog: true,
        ground: true,
        dimStarScale: 1,
      };
  }
}
