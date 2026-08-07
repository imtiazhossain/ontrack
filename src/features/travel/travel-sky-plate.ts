/** Shared SVG plate size for itinerary header sky chrome. */
export const SKY_VIEW_W = 360;
export const SKY_VIEW_H = 140;
/** Keep sun/moon discs fully below the status-bar band. */
export const SKY_CELESTIAL_CLEARANCE = 34;

/**
 * Single full-plate viewBox — the sky renders once on app-shell chrome
 * (status bar + header as one continuous scene, never duplicated).
 */
export const SKY_PLATE_VIEWBOX = `0 0 ${SKY_VIEW_W} ${SKY_VIEW_H}`;
