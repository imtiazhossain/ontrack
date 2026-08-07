import type { ViewStyle } from 'react-native';

/** Shared SVG plate size for itinerary header sky chrome. */
export const SKY_VIEW_W = 360;
export const SKY_VIEW_H = 140;
/** Keep sun/moon discs fully below the status-bar band. */
export const SKY_CELESTIAL_CLEARANCE = 18;

/**
 * Single full-plate viewBox — the sky renders once on app-shell chrome
 * (status bar + header as one continuous scene, never duplicated).
 */
export const SKY_PLATE_VIEWBOX = `0 0 ${SKY_VIEW_W} ${SKY_VIEW_H}`;

/**
 * Square host for sun/moon discs. The sky plate uses `preserveAspectRatio="none"`
 * so full-plate Circles stretch with the band; discs render in this aspect-locked
 * box instead (width tracks plate X, height matches width).
 */
export function celestialDiscHostStyle(
  cx: number,
  cy: number,
  /** ViewBox edge length centered on (cx, cy). */
  box: number,
): ViewStyle {
  return {
    position: 'absolute',
    left: `${(cx / SKY_VIEW_W) * 100}%`,
    top: `${(cy / SKY_VIEW_H) * 100}%`,
    width: `${(box / SKY_VIEW_W) * 100}%`,
    aspectRatio: 1,
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
  };
}