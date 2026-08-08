import type { ImageContentPosition } from 'expo-image';

import { relativeLuminanceFromHex } from '@/features/travel/travel-home-atmosphere-ink';

/**
 * Default focal Y for trip-card heroes. The plate is a short ~2:1 cover crop;
 * landscape photos otherwise pin to mid-sky and read empty.
 */
export const TRAVEL_HOME_HERO_FOCUS_TOP_DEFAULT = 74;

/**
 * Vertical focal point (0–100, top → bottom) for trip-card destination heroes.
 * Bright / washed average colors usually mean sky-forward plates — push the
 * subject further up into the frame. Dark night/aurora plates keep more sky.
 */
export function travelHomeHeroFocusTopPercent(averageColor?: string): number {
  const luma = averageColor
    ? relativeLuminanceFromHex(averageColor)
    : undefined;
  if (luma === undefined) return TRAVEL_HOME_HERO_FOCUS_TOP_DEFAULT;
  if (luma >= 0.55) return 80;
  if (luma <= 0.28) return 48;
  return 66;
}

/** expo-image contentPosition for a trip-card hero plate. */
export function travelHomeHeroContentPosition(
  averageColor?: string,
): ImageContentPosition {
  return {
    top: `${travelHomeHeroFocusTopPercent(averageColor)}%`,
    left: '50%',
  };
}
