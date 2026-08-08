/**
 * Shared glass / frost materials for app chrome.
 * iOS uses BlurView + these fills; Android uses wash gradients (no blur stack).
 */

export const glassMaterials = {
  border: {
    light: 'rgba(255,255,255,0.65)',
    lightAiry: 'rgba(255,255,255,0.5)',
    lightStrong: 'rgba(255,255,255,0.7)',
    dark: 'rgba(255,255,255,0.2)',
    darkStrong: 'rgba(255,255,255,0.22)',
  },
  fill: {
    lightBlur: 'rgba(255, 255, 255, 0.32)',
    lightSolid: 'rgba(255, 255, 255, 0.78)',
    lightAiryBlur: 'rgba(255, 255, 255, 0.28)',
    lightAirySolid: 'rgba(255, 255, 255, 0.58)',
    darkBlur: 'rgba(0, 0, 0, 0.32)',
    darkSolid: 'rgba(0, 0, 0, 0.55)',
    darkAiryBlur: 'rgba(0, 0, 0, 0.22)',
    darkAirySolid: 'rgba(0, 0, 0, 0.4)',
    invertedBlur: 'rgba(0, 0, 0, 0.58)',
    invertedSolid: 'rgba(0, 0, 0, 0.68)',
  },
  /** Frosted field pills on glass sheets. */
  field: {
    light: 'rgba(255, 255, 255, 0.68)',
    dark: 'rgba(255, 255, 255, 0.10)',
    borderLight: 'rgba(255, 255, 255, 0.78)',
    borderDark: 'rgba(255, 255, 255, 0.20)',
  },
  /** Sage accent (sheet primary CTA / View Itinerary). */
  accentGreen: {
    fill: 'rgba(78, 122, 84, 0.48)',
    fillFallback: 'rgba(78, 122, 84, 0.62)',
    border: 'rgba(180, 220, 185, 0.38)',
    fillLight: 'rgba(78, 122, 84, 0.72)',
    fillLightFallback: 'rgba(78, 122, 84, 0.82)',
    borderLight: 'rgba(78, 122, 84, 0.28)',
    solid: '#4E7A54',
    shadow: '0 6px 16px rgba(78,122,84,0.22)',
    shadowDark: '0 6px 18px rgba(78,122,84,0.42)',
  },
  clear: {
    lightBg: '#FFFFFF',
    lightBorder: 'rgba(17, 74, 110, 0.10)',
    washLightBg: 'rgba(36, 116, 168, 0.10)',
    washLightBorder: 'rgba(255,255,255,0.55)',
    darkBg: 'rgba(255,255,255,0.05)',
    darkBorder: 'rgba(255,255,255,0.22)',
  },
  /**
   * Page atmosphere under glass — enough chroma/luma delta that frosted
   * plates read as glass, not milk on flat paper. Editorial warm wash.
   */
  atmosphere: {
    lightTop: '#DCC9B4',
    lightMid: '#E9DFD0',
    lightBottom: '#F2EBE1',
    lightOrb: 'rgba(196, 140, 90, 0.28)',
    lightCool: 'rgba(120, 148, 168, 0.16)',
    darkTop: '#241C18',
    darkMid: '#16131A',
    darkBottom: '#0C0B10',
    darkOrb: 'rgba(180, 120, 70, 0.22)',
    darkCool: 'rgba(70, 100, 130, 0.18)',
  },
  sheet: {
    /** Keep translucent enough that backdrop chroma reads through frost. */
    lightFillBlur: 'rgba(255, 255, 255, 0.42)',
    lightFillSolid: 'rgba(255, 255, 255, 0.82)',
    darkFillBlur: 'rgba(12, 16, 24, 0.42)',
    darkFillSolid: 'rgba(12, 16, 24, 0.78)',
  },
  nav: {
    lightFillBlur: 'rgba(255, 255, 255, 0.42)',
    lightFillSolid: 'rgba(247, 244, 238, 0.92)',
    darkFillBlur: 'rgba(12, 16, 24, 0.45)',
    darkFillSolid: 'rgba(14, 13, 18, 0.92)',
  },
} as const;

export function glassFieldBackground(appearance: 'light' | 'dark'): string {
  return appearance === 'dark' ? glassMaterials.field.dark : glassMaterials.field.light;
}

export function glassFieldBorder(appearance: 'light' | 'dark'): string {
  return appearance === 'dark'
    ? glassMaterials.field.borderDark
    : glassMaterials.field.borderLight;
}
