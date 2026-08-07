import { Platform } from 'react-native';

/**
 * Itinerary sky fidelity ladder.
 * Degrades from full motion → static chrome wash so weak devices stay open.
 */
export type TravelSkyQuality = 'full' | 'reduced' | 'minimal' | 'static';

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

export type TravelSkyCapabilityInput = {
  /** expo-device `deviceYearClass` (null on many sims). */
  deviceYearClass?: number | null;
  /** expo-device `totalMemory` bytes. */
  totalMemory?: number | null;
  /** Physical device vs Simulator / emulator. */
  isDevice?: boolean;
  /** Accessibility Reduce Motion. */
  reduceMotion?: boolean;
  platformOs?: typeof Platform.OS;
};

const QUALITY_ORDER: TravelSkyQuality[] = [
  'full',
  'reduced',
  'minimal',
  'static',
];

export function degradeTravelSkyQuality(
  quality: TravelSkyQuality,
): TravelSkyQuality {
  const i = QUALITY_ORDER.indexOf(quality);
  if (i < 0 || i >= QUALITY_ORDER.length - 1) return 'static';
  return QUALITY_ORDER[i + 1]!;
}

export function travelSkyQualityRank(quality: TravelSkyQuality): number {
  return QUALITY_ORDER.indexOf(quality);
}

/** Pick the weaker of two tiers. */
export function minTravelSkyQuality(
  a: TravelSkyQuality,
  b: TravelSkyQuality,
): TravelSkyQuality {
  return travelSkyQualityRank(a) >= travelSkyQualityRank(b) ? a : b;
}

/**
 * Device / a11y → starting sky tier.
 * Simulators stay `full` so agent-ui can exercise the live plate.
 */
export function resolveTravelSkyCapability(
  input: TravelSkyCapabilityInput = {},
): TravelSkyQuality {
  if (input.reduceMotion) return 'minimal';

  const isDevice = input.isDevice ?? true;
  if (!isDevice) return 'full';

  const year = input.deviceYearClass ?? null;
  const mem = input.totalMemory ?? null;
  const memGb = mem != null && mem > 0 ? mem / (1024 * 1024 * 1024) : null;
  const os = input.platformOs ?? Platform.OS;

  // Very constrained — chrome wash only.
  if (
    (memGb != null && memGb < 2.4) ||
    (year != null && year <= 2016) ||
    (os === 'android' && memGb != null && memGb < 3 && year != null && year <= 2018)
  ) {
    return 'static';
  }

  // Static SVG plate, no loops.
  if (
    (memGb != null && memGb < 3.2) ||
    (year != null && year <= 2018)
  ) {
    return 'minimal';
  }

  // Thinned motion set.
  if (
    (memGb != null && memGb < 4.5) ||
    (year != null && year <= 2021) ||
    (os === 'android' && memGb != null && memGb < 5.5)
  ) {
    return 'reduced';
  }

  return 'full';
}

/** Map a quality tier to concrete FX switches. */
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
