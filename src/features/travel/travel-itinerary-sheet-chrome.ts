import type { Theme } from '@/design-system';

/** Compatibility shape for Travel callers; values now resolve from the shared semantic theme. */
export type ItinerarySheetChrome = {
  sheetBg: string;
  fieldBg: string;
  fieldBorder: string;
  handle: string;
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
  importTitle: string;
  importSubtitle: string;
  importActionBorder: string;
  importActionBg: string;
  closeBg: string;
  closeIcon: string;
  ctaFrom: string;
  ctaTo: string;
  ctaText: string;
  icons: Record<
    | 'import'
    | 'lodging'
    | 'location'
    | 'calendar'
    | 'clock'
    | 'shield'
    | 'link'
    | 'flight'
    | 'note'
    | 'photo'
    | 'expense'
    | 'currency'
    | 'chat'
    | 'people',
    { bg: string; fg: string; field: string }
  >;
};

export function itinerarySheetChrome(theme: Theme): ItinerarySheetChrome {
  const icons: ItinerarySheetChrome['icons'] = theme.name === 'dark'
    ? {
        import: { bg: '#164052', fg: '#79DCF2', field: '#132F3C' },
        lodging: { bg: '#4A3021', fg: '#FFAA69', field: '#36271D' },
        location: { bg: '#143F3C', fg: '#68D7CC', field: '#12302F' },
        calendar: { bg: '#342E5A', fg: '#B9A7FF', field: '#292544' },
        clock: { bg: '#493A1E', fg: '#FFD166', field: '#352D1D' },
        shield: { bg: '#3E441A', fg: '#C7DD69', field: '#303417' },
        link: { bg: '#302E5B', fg: '#AAA7FF', field: '#262548' },
        flight: { bg: '#1D3761', fg: '#84B6FF', field: '#182B47' },
        note: { bg: '#174047', fg: '#71D9E1', field: '#143136' },
        photo: { bg: '#46401F', fg: '#E8CF6D', field: '#343019' },
        expense: { bg: '#3B3150', fg: '#C6ADE1', field: '#2D273B' },
        currency: { bg: '#1C493B', fg: '#75D8AE', field: '#18352D' },
        chat: { bg: '#4E3028', fg: '#FFAA8A', field: '#38261F' },
        people: { bg: '#263451', fg: '#92A9E8', field: '#202B42' },
      }
    : {
        import: { bg: '#C9F0FA', fg: '#087F9D', field: '#FFFFFF' },
        lodging: { bg: '#FFDCC2', fg: '#A94F13', field: '#FFFFFF' },
        location: { bg: '#C9F2EC', fg: '#087E73', field: '#FFFFFF' },
        calendar: { bg: '#E1DCFF', fg: '#6651C8', field: '#FFFFFF' },
        clock: { bg: '#FFE7AE', fg: '#9A6500', field: '#FFFFFF' },
        shield: { bg: '#E8F1BA', fg: '#657A12', field: '#FFFFFF' },
        link: { bg: '#DEDFFF', fg: '#514DB0', field: '#FFFFFF' },
        flight: { bg: '#D4E5FF', fg: '#2869B5', field: '#FFFFFF' },
        note: { bg: '#CCF1F4', fg: '#177F88', field: '#FFFFFF' },
        photo: { bg: '#F2E0B7', fg: '#806012', field: '#FFFFFF' },
        expense: { bg: '#E6DAEB', fg: '#6D4B78', field: '#FFFFFF' },
        currency: { bg: '#D2F0E3', fg: '#267A57', field: '#FFFFFF' },
        chat: { bg: '#FFE0D4', fg: '#AE5435', field: '#FFFFFF' },
        people: { bg: '#D8E1F7', fg: '#455FA6', field: '#FFFFFF' },
      };
  return {
    sheetBg: theme.backgroundElevated,
    fieldBg: theme.name === 'light' ? '#FFFFFF' : theme.backgroundSunken,
    fieldBorder: theme.separator,
    handle: theme.textTertiary,
    title: theme.textPrimary,
    subtitle: theme.textSecondary,
    label: theme.textPrimary,
    placeholder: theme.name === 'light' ? '#A0AFB9' : theme.textTertiary,
    importTitle: theme.textPrimary,
    importSubtitle: theme.textSecondary,
    importActionBorder: theme.separator,
    importActionBg: theme.backgroundSunken,
    closeBg: theme.backgroundSunken,
    closeIcon: theme.textSecondary,
    ctaFrom: theme.accentPrimary,
    ctaTo: theme.accentSoft,
    ctaText: theme.textOnAccent,
    icons,
  };
}

export type SheetIconTone = keyof ItinerarySheetChrome['icons'];

export function travelInputFieldBackground(theme: Theme): string {
  return theme.name === 'light' ? '#FFFFFF' : theme.backgroundSunken;
}

/** Shared stacked-field colors used by Travel editors. */
export function itinerarySheetFieldProps(
  chrome: ItinerarySheetChrome,
  tone: SheetIconTone,
) {
  const icon = chrome.icons[tone];
  return {
    iconBackground: icon.bg,
    iconColor: icon.fg,
    fieldBackground: icon.field,
    stackedLabelColor: chrome.label,
    placeholderColor: chrome.placeholder,
    placeholderTextColor: chrome.placeholder,
  };
}
