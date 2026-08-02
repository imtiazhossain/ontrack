import type { AppIconName, Theme } from '@/design-system';
import { TRAVEL_EDITORIAL_ACCENT } from '@/features/travel/travel-surface';
import type { TravelItemKind } from '@/features/travel/types';

/** Vision-board jewel accents remapped for travel kinds. */
const KIND_LIGHT = {
  flight: TRAVEL_EDITORIAL_ACCENT,
  stay: '#4A7399',
  rental: '#9A7040',
  activity: '#52745A',
  moment: '#A85661',
} as const;

const KIND_DARK = {
  flight: '#C4A07A',
  stay: '#7FA3C4',
  rental: '#C4A070',
  activity: '#7A9A80',
  moment: '#C4848C',
} as const;

const TINT_LIGHT = {
  flight: '#EFE4D4',
  stay: '#DEE8F1',
  rental: '#EFE4D4',
  activity: '#DFE8DC',
  moment: '#F2DDE0',
} as const;

const TINT_DARK = {
  flight: '#2A241C',
  stay: '#1C2430',
  rental: '#2A241C',
  activity: '#1C241E',
  moment: '#2A1E20',
} as const;

/** Kind accent colors for timeline dots, borders, and pills. */
export function kindAccent(kind: TravelItemKind, theme: Theme): string {
  const palette = theme.name === 'dark' ? KIND_DARK : KIND_LIGHT;
  return palette[kind] ?? TRAVEL_EDITORIAL_ACCENT;
}

/** Soft tint behind kind pills / day accents. */
export function kindTint(kind: TravelItemKind, theme: Theme): string {
  const palette = theme.name === 'dark' ? TINT_DARK : TINT_LIGHT;
  return palette[kind] ?? theme.accentFaint;
}

export function kindIcon(kind: TravelItemKind): AppIconName {
  switch (kind) {
    case 'flight':
      return 'flight';
    case 'stay':
      return 'lodging';
    case 'rental':
      return 'vehicles';
    case 'activity':
      return 'list';
    case 'moment':
      return 'photo';
    default:
      return 'list';
  }
}

/** Cycling day-card stripe colors — vision-board jewel rhythm. */
export function dayStripeColor(dayIndex: number, theme: Theme): string {
  const light = [
    TRAVEL_EDITORIAL_ACCENT,
    '#4A7399',
    '#52745A',
    '#9A7040',
    '#A85661',
    '#746393',
  ];
  const dark = [
    '#C4A07A',
    '#7FA3C4',
    '#7A9A80',
    '#C4A070',
    '#C4848C',
    '#9A8BB0',
  ];
  const palette = theme.name === 'dark' ? dark : light;
  return palette[dayIndex % palette.length]!;
}

/** Alias used by timeline spine dots. */
export function kindDotColor(kind: TravelItemKind, theme: Theme): string {
  return kindAccent(kind, theme);
}
