/**
 * Color tokens. Semantic theme colors live in themes.ts — screens should
 * consume colors via useTheme(), never from these raw palettes directly.
 */

export const palette = {
  // Warm neutrals (paper / ink)
  paper0: '#FBFAF7',
  paper1: '#F5F2EC',
  paper2: '#ECE7DE',
  paper3: '#DFD9CD',
  ink0: '#1B1815',
  ink1: '#3D3833',
  ink2: '#6E675E',
  ink3: '#9C948A',

  // Dark warm neutrals
  night0: '#141210',
  night1: '#1E1B18',
  night2: '#2A2622',
  night3: '#3A352F',
  cream0: '#F4F0E9',
  cream1: '#D8D2C8',
  cream2: '#A69E92',

  // Accent — burnished copper
  copper: '#B4602F',
  copperSoft: '#C97C4B',
  copperFaint: '#F0DFD2',
  copperDeep: '#8F4A22',

  // Status
  green: '#4E7A54',
  greenBright: '#6FA276',
  amber: '#C28B2E',
  red: '#B04A3F',
  redBright: '#CE6C60',
} as const;

/** Muted jewel tones per activity category. */
export const categoryPalette = {
  food: { light: '#C06B2F', dark: '#D98F55', tintLight: '#F3E2D2', tintDark: '#33261B' },
  gym: { light: '#A5453C', dark: '#CC6E63', tintLight: '#F2DCD9', tintDark: '#33201D' },
  work: { light: '#41678A', dark: '#7BA0C2', tintLight: '#DCE5EE', tintDark: '#1D2733' },
  sleep: { light: '#5D538F', dark: '#948AC2', tintLight: '#E2DFEF', tintDark: '#242033' },
  water: { light: '#3B7E8C', dark: '#6FAEBB', tintLight: '#D9E9EC', tintDark: '#1A2C30' },
  personal: { light: '#557C50', dark: '#84AC7F', tintLight: '#DEE9DC', tintDark: '#20301E' },
  mindfulness: { light: '#7A6494', dark: '#A990C2', tintLight: '#E7E0EE', tintDark: '#2B2333' },
  learning: { light: '#8A6B2F', dark: '#BA9A57', tintLight: '#EEE5D2', tintDark: '#302818' },
  appointment: { light: '#8A4F6D', dark: '#B87E9C', tintLight: '#EEDDE6', tintDark: '#301E28' },
  habit: { light: '#4E7A54', dark: '#7EA884', tintLight: '#DCE9DE', tintDark: '#1E2F21' },
  movie: { light: '#8B4A63', dark: '#C17C97', tintLight: '#F0DDE5', tintDark: '#321E26' },
  custom: { light: '#6E675E', dark: '#A69E92', tintLight: '#E8E4DD', tintDark: '#2A2622' },
} as const;

export type CategoryColorKey = keyof typeof categoryPalette;
