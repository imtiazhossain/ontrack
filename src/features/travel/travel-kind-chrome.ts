import type { AppIconName, Theme } from '@/design-system';
import { TRAVEL_EDITORIAL_ACCENT } from '@/features/travel/travel-surface';
import type { TravelItemKind } from '@/features/travel/types';

type KindChromeSwatch = {
  accent: string;
  tint: string;
  border: string;
};

/**
 * Single source of truth for itinerary kind colors — Add-to-Timeline picker,
 * timeline stripes/dots, and structured detail cards all read from here.
 *
 * Moment uses rose so it stays distinct from Stay’s warm tan.
 */
const KIND_CHROME_LIGHT: Record<TravelItemKind, KindChromeSwatch> = {
  moment: { accent: '#A85661', tint: '#F7E8EB', border: '#E8CDD3' },
  activity: { accent: '#56663A', tint: '#F2F2E9', border: '#D9DBC8' },
  flight: { accent: '#315A7C', tint: '#EDF3F8', border: '#C9D9E6' },
  stay: { accent: '#765432', tint: '#F7EEE4', border: '#E8D4BB' },
  rental: { accent: '#644A75', tint: '#F3EEF5', border: '#DDD0E3' },
};

const KIND_CHROME_DARK: Record<TravelItemKind, KindChromeSwatch> = {
  moment: { accent: '#D68C96', tint: '#2A1E20', border: '#5A3E44' },
  activity: { accent: '#ADBF87', tint: '#22261D', border: '#48513A' },
  flight: { accent: '#8DB2CF', tint: '#1B252D', border: '#3D5262' },
  stay: { accent: '#D7AE83', tint: '#29221C', border: '#594938' },
  rental: { accent: '#BCA2CC', tint: '#26202A', border: '#51445A' },
};

/** Full chrome swatch for a travel item kind. */
export function kindChrome(
  kind: TravelItemKind,
  theme: Theme,
): KindChromeSwatch {
  const palette = theme.name === 'dark' ? KIND_CHROME_DARK : KIND_CHROME_LIGHT;
  return palette[kind] ?? KIND_CHROME_LIGHT.activity;
}

/** Kind accent colors for timeline dots, borders, and pills. */
export function kindAccent(kind: TravelItemKind, theme: Theme): string {
  return kindChrome(kind, theme).accent;
}

/** Soft tint behind kind pills / day accents. */
export function kindTint(kind: TravelItemKind, theme: Theme): string {
  return kindChrome(kind, theme).tint;
}

/** Soft border used by the Add-to-Timeline choice cards. */
export function kindBorder(kind: TravelItemKind, theme: Theme): string {
  return kindChrome(kind, theme).border;
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
      return 'location';
    case 'moment':
      return 'bookmark';
    default:
      return 'list';
  }
}

/** Cycling day-card stripe colors — same rhythm as kind accents. */
export function dayStripeColor(dayIndex: number, theme: Theme): string {
  const light = [
    KIND_CHROME_LIGHT.flight.accent,
    KIND_CHROME_LIGHT.stay.accent,
    KIND_CHROME_LIGHT.activity.accent,
    KIND_CHROME_LIGHT.rental.accent,
    KIND_CHROME_LIGHT.moment.accent,
    TRAVEL_EDITORIAL_ACCENT,
  ];
  const dark = [
    KIND_CHROME_DARK.flight.accent,
    KIND_CHROME_DARK.stay.accent,
    KIND_CHROME_DARK.activity.accent,
    KIND_CHROME_DARK.rental.accent,
    KIND_CHROME_DARK.moment.accent,
    '#C4A07A',
  ];
  const palette = theme.name === 'dark' ? dark : light;
  return palette[dayIndex % palette.length]!;
}

/** Alias used by timeline spine dots. */
export function kindDotColor(kind: TravelItemKind, theme: Theme): string {
  return kindAccent(kind, theme);
}
