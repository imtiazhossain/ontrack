import { Platform } from 'react-native';

/**
 * App-wide fidelity ladder for motion, blur, and heavy plates.
 * Degrades toward static chrome so constrained devices stay open.
 */
export type PerformanceTier = 'full' | 'reduced' | 'minimal' | 'static';

export type DeviceCapabilityInput = {
  deviceYearClass?: number | null;
  totalMemory?: number | null;
  isDevice?: boolean;
  reduceMotion?: boolean;
  platformOs?: typeof Platform.OS;
};

const TIER_ORDER: PerformanceTier[] = [
  'full',
  'reduced',
  'minimal',
  'static',
];

export function performanceTierRank(tier: PerformanceTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function degradePerformanceTier(tier: PerformanceTier): PerformanceTier {
  const i = TIER_ORDER.indexOf(tier);
  if (i < 0 || i >= TIER_ORDER.length - 1) return 'static';
  return TIER_ORDER[i + 1]!;
}

/** Pick the weaker (more constrained) of two tiers. */
export function minPerformanceTier(
  a: PerformanceTier,
  b: PerformanceTier,
): PerformanceTier {
  return performanceTierRank(a) >= performanceTierRank(b) ? a : b;
}

/**
 * Device / a11y → starting performance tier.
 * Simulators stay `full` so agent-ui can exercise live surfaces.
 */
export function resolvePerformanceTier(
  input: DeviceCapabilityInput = {},
): PerformanceTier {
  if (input.reduceMotion) return 'minimal';

  const isDevice = input.isDevice ?? true;
  if (!isDevice) return 'full';

  const year = input.deviceYearClass ?? null;
  const mem = input.totalMemory ?? null;
  const memGb = mem != null && mem > 0 ? mem / (1024 * 1024 * 1024) : null;
  const os = input.platformOs ?? Platform.OS;

  if (
    (memGb != null && memGb < 2.4) ||
    (year != null && year <= 2016) ||
    (os === 'android' &&
      memGb != null &&
      memGb < 3 &&
      year != null &&
      year <= 2018)
  ) {
    return 'static';
  }

  if ((memGb != null && memGb < 3.2) || (year != null && year <= 2018)) {
    return 'minimal';
  }

  if (
    (memGb != null && memGb < 4.5) ||
    (year != null && year <= 2021) ||
    (os === 'android' && memGb != null && memGb < 5.5)
  ) {
    return 'reduced';
  }

  return 'full';
}

/** Feature gates derived from a tier (cheap shared checks). */
export type PerformanceGates = {
  tier: PerformanceTier;
  /** Frosted BlurView / heavy image blur. */
  allowsBlur: boolean;
  /** Infinite Reanimated loops (anatomy, fans, sky particles). */
  allowsLoopMotion: boolean;
  /** DeviceMotion / continuous sensors. */
  allowsSensors: boolean;
  /** Reanimated SharedTransition / shared-element tags. */
  allowsSharedElement: boolean;
  /** 0…1 scale for particle / spawn budgets. */
  particleScale: number;
  /** Prefer static SVG/chrome over animated path props. */
  allowsAnimatedSvgProps: boolean;
};

export function performanceGatesFor(
  tier: PerformanceTier,
  platformOs: typeof Platform.OS = Platform.OS,
): PerformanceGates {
  switch (tier) {
    case 'static':
      return {
        tier,
        allowsBlur: false,
        allowsLoopMotion: false,
        allowsSensors: false,
        allowsSharedElement: false,
        particleScale: 0,
        allowsAnimatedSvgProps: false,
      };
    case 'minimal':
      return {
        tier,
        allowsBlur: false,
        allowsLoopMotion: false,
        allowsSensors: false,
        allowsSharedElement: false,
        particleScale: 0,
        allowsAnimatedSvgProps: false,
      };
    case 'reduced':
      return {
        tier,
        // iOS blur is cheaper than Android photo-frost stacks.
        allowsBlur: platformOs === 'ios',
        allowsLoopMotion: true,
        allowsSensors: false,
        allowsSharedElement: false,
        particleScale: 0.45,
        allowsAnimatedSvgProps: false,
      };
    default:
      return {
        tier: 'full',
        allowsBlur: true,
        allowsLoopMotion: true,
        allowsSensors: true,
        allowsSharedElement: true,
        particleScale: 1,
        allowsAnimatedSvgProps: true,
      };
  }
}
