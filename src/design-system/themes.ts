/**
 * VISUAL DIRECTION — decided after exploring three options for the Today screen:
 *
 * 1. Sophisticated editorial — serif display type, warm paper surfaces, generous
 *    whitespace, magazine-like hierarchy. High impact, excellent readability,
 *    scales cleanly to many activity types, easy to maintain (type + color only).
 * 2. Futuristic spatial — layered translucency, glows, dimensional cards. Striking
 *    but risks low contrast, heavy blur cost, and fights iOS conventions.
 * 3. Calm luxury — muted jewel tones, soft depth, restrained motion. Beautiful and
 *    calm but can read as generic "wellness app" without a stronger identity.
 *
 * Chosen: EDITORIAL foundation (1) blended with the calm-luxury palette (3):
 * warm paper/ink surfaces, serif headlines, one burnished-copper accent, and
 * muted jewel category tints. Distinctive in a screenshot, calm in daily use,
 * and fully workable in light and dark mode.
 */

import { categoryPalette, palette, type CategoryColorKey } from './colors';

export interface Theme {
  name: 'light' | 'dark';
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundElevated: string;
  backgroundSunken: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnAccent: string;
  accentPrimary: string;
  accentSoft: string;
  accentFaint: string;
  separator: string;
  success: string;
  warning: string;
  danger: string;
  overlayScrim: string;
}

export const lightTheme: Theme = {
  name: 'light',
  backgroundPrimary: palette.paper0,
  backgroundSecondary: palette.paper1,
  backgroundElevated: '#FFFFFF',
  backgroundSunken: palette.paper2,
  textPrimary: palette.ink0,
  textSecondary: palette.ink2,
  textTertiary: palette.ink3,
  textOnAccent: '#FFF9F2',
  accentPrimary: palette.copper,
  accentSoft: palette.copperSoft,
  accentFaint: palette.copperFaint,
  separator: palette.paper3,
  success: palette.green,
  warning: palette.amber,
  danger: palette.red,
  overlayScrim: 'rgba(27, 24, 21, 0.45)',
};

export const darkTheme: Theme = {
  name: 'dark',
  backgroundPrimary: palette.night0,
  backgroundSecondary: palette.night1,
  backgroundElevated: palette.night2,
  backgroundSunken: palette.night1,
  textPrimary: palette.cream0,
  textSecondary: palette.cream1,
  textTertiary: palette.cream2,
  textOnAccent: '#FFF9F2',
  accentPrimary: palette.copperSoft,
  accentSoft: palette.copper,
  accentFaint: '#33261B',
  separator: palette.night3,
  success: palette.greenBright,
  warning: palette.amber,
  danger: palette.redBright,
  overlayScrim: 'rgba(0, 0, 0, 0.6)',
};

export interface CategoryColors {
  main: string;
  tint: string;
}

export function categoryColors(theme: Theme, key: CategoryColorKey): CategoryColors {
  const c = categoryPalette[key];
  return theme.name === 'light'
    ? { main: c.light, tint: c.tintLight }
    : { main: c.dark, tint: c.tintDark };
}

/** Time-of-day ambient wash colors for the Today header. */
export function timeOfDayGradient(theme: Theme, hour: number): [string, string] {
  const light = theme.name === 'light';
  if (hour < 6) return light ? ['#E4E0EC', palette.paper0] : ['#221F2E', palette.night0];
  if (hour < 11) return light ? ['#F4E7D3', palette.paper0] : ['#2E2418', palette.night0];
  if (hour < 17) return light ? ['#F0EBDD', palette.paper0] : ['#292520', palette.night0];
  if (hour < 21) return light ? ['#EFDFD3', palette.paper0] : ['#2E211A', palette.night0];
  return light ? ['#E1DFE9', palette.paper0] : ['#1F1D28', palette.night0];
}
