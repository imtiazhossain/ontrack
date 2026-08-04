import type { Theme } from '@/design-system';
import type { ItinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';

/**
 * Convert Currency mock palette — forest green ink, soft sage surfaces, cream paper.
 * Sampled from the currency converter mock (Done ≈ #536942, badges ≈ #506840).
 */
export type CurrencySheetChrome = {
  sheetBg: string;
  cardBg: string;
  softBg: string;
  fieldBorder: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
  accent: string;
  accentMuted: string;
  onAccent: string;
  closeBg: string;
};

export function currencySheetChrome(theme: Theme): CurrencySheetChrome {
  if (theme.name === 'dark') {
    return {
      sheetBg: '#141812',
      cardBg: '#1C211A',
      softBg: '#252B22',
      fieldBorder: 'rgba(180, 200, 160, 0.10)',
      eyebrow: '#A89878',
      title: '#E4EAD8',
      subtitle: '#9AAB8E',
      label: '#8A9A7C',
      placeholder: '#6E7A64',
      accent: '#8FA878',
      accentMuted: '#9AB088',
      onAccent: '#121610',
      closeBg: '#252B22',
    };
  }

  return {
    sheetBg: '#FBF8F3',
    cardBg: '#FFFFFF',
    softBg: '#E9EDE1',
    fieldBorder: 'rgba(80, 104, 64, 0.10)',
    eyebrow: '#9A8A6E',
    title: '#3F5136',
    subtitle: '#6B7A62',
    label: '#7A8570',
    placeholder: '#A3AD98',
    accent: '#506840',
    accentMuted: '#6B7A62',
    onAccent: '#FFFDF8',
    closeBg: '#FFFFFF',
  };
}

/** Map currency palette onto the shared travel sheet chrome shape. */
export function currencyAsItineraryChrome(theme: Theme): ItinerarySheetChrome {
  const c = currencySheetChrome(theme);
  const icon = { bg: c.softBg, fg: c.accent, field: c.cardBg };
  return {
    sheetBg: c.sheetBg,
    fieldBg: c.softBg,
    fieldBorder: c.fieldBorder,
    handle: c.label,
    title: c.title,
    subtitle: c.subtitle,
    label: c.label,
    placeholder: c.placeholder,
    importTitle: c.title,
    importSubtitle: c.subtitle,
    importActionBorder: c.fieldBorder,
    importActionBg: c.cardBg,
    closeBg: c.closeBg,
    closeIcon: c.title,
    ctaFrom: c.eyebrow,
    ctaTo: c.accent,
    ctaText: c.onAccent,
    icons: {
      import: icon,
      lodging: icon,
      location: icon,
      calendar: icon,
      clock: icon,
      shield: icon,
      link: icon,
      flight: icon,
      note: icon,
      photo: icon,
      expense: icon,
      currency: icon,
      chat: icon,
      people: icon,
    },
  };
}
