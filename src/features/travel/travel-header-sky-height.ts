import { StyleSheet, type ViewStyle } from 'react-native';

/**
 * Content-space height of the itinerary sky band (below the status-bar inset).
 * Chrome height = insets.top + this + fade tail — title sits in sky, then a
 * short dissolve ends just below the dates card into theme paper.
 */
export const TRAVEL_HEADER_SKY_CONTENT_BAND = 152;

/**
 * Extra chrome-overlay height below the content band — only enough for the
 * dates card to sit on sky and the wash to finish just underneath it.
 */
export const TRAVEL_HEADER_SKY_FADE_TAIL = 40;

/** Pull the dates glass up into the lower sky so the hero reads as one. */
export const TRAVEL_HEADER_DATES_SKY_OVERLAP = 24;

/**
 * Page paper under the sky band. Sky chrome eases into theme base by `fadeTail`
 * (just below the dates) — solid paper for the rest of the page, no long wash.
 */
export function travelPlanSkyPageWashStyle(options: {
  skyContentBand: number;
  washTop: string;
  paper: string;
  fadeTail?: number;
}): ViewStyle {
  const fadeTail = options.fadeTail ?? TRAVEL_HEADER_SKY_FADE_TAIL;
  return {
    ...StyleSheet.absoluteFill,
    top: options.skyContentBand,
    backgroundColor: options.paper,
    experimental_backgroundImage: `linear-gradient(to bottom, ${options.washTop} 0%, ${options.paper} ${fadeTail}px, ${options.paper} 100%)`,
  };
}
