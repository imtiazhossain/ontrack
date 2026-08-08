import {
    glassFieldBackground,
    glassFieldBorder,
    radii,
    type Theme,
} from '@/design-system';

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
  const field = glassFieldBackground(theme.name);
  const icons: ItinerarySheetChrome['icons'] = theme.name === 'dark'
    ? {
        import: { bg: '#164052', fg: '#79DCF2', field },
        lodging: { bg: '#4A3021', fg: '#FFAA69', field },
        location: { bg: '#143F3C', fg: '#68D7CC', field },
        calendar: { bg: '#342E5A', fg: '#B9A7FF', field },
        clock: { bg: '#493A1E', fg: '#FFD166', field },
        shield: { bg: '#3E441A', fg: '#C7DD69', field },
        link: { bg: '#302E5B', fg: '#AAA7FF', field },
        flight: { bg: '#1D3761', fg: '#84B6FF', field },
        note: { bg: '#174047', fg: '#71D9E1', field },
        photo: { bg: '#46401F', fg: '#E8CF6D', field },
        expense: { bg: '#3B3150', fg: '#C6ADE1', field },
        currency: { bg: '#1C493B', fg: '#75D8AE', field },
        chat: { bg: '#4E3028', fg: '#FFAA8A', field },
        people: { bg: '#263451', fg: '#92A9E8', field },
      }
    : {
        import: { bg: '#C9F0FA', fg: '#087F9D', field },
        lodging: { bg: '#FFDCC2', fg: '#A94F13', field },
        location: { bg: '#C9F2EC', fg: '#087E73', field },
        calendar: { bg: '#E1DCFF', fg: '#6651C8', field },
        clock: { bg: '#FFE7AE', fg: '#9A6500', field },
        shield: { bg: '#E8F1BA', fg: '#657A12', field },
        link: { bg: '#DEDFFF', fg: '#514DB0', field },
        flight: { bg: '#D4E5FF', fg: '#2869B5', field },
        note: { bg: '#CCF1F4', fg: '#177F88', field },
        photo: { bg: '#F2E0B7', fg: '#806012', field },
        expense: { bg: '#E6DAEB', fg: '#6D4B78', field },
        currency: { bg: '#D2F0E3', fg: '#267A57', field },
        chat: { bg: '#FFE0D4', fg: '#AE5435', field },
        people: { bg: '#D8E1F7', fg: '#455FA6', field },
      };
  return {
    sheetBg: theme.backgroundElevated,
    // Solid elevated fill for non-field chrome (chat bubbles, dialogs, logos).
    fieldBg: theme.name === 'light' ? '#FFFFFF' : theme.backgroundSunken,
    fieldBorder: glassFieldBorder(theme.name),
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
  return glassFieldBackground(theme.name);
}

/** Shared stacked-field chrome used by Travel editors on glass sheets. */
export function itinerarySheetFieldProps(
  chrome: ItinerarySheetChrome,
  tone: SheetIconTone,
) {
  const icon = chrome.icons[tone];
  return {
    iconBackground: icon.bg,
    iconColor: icon.fg,
    fieldBackground: icon.field,
    fieldBorderColor: chrome.fieldBorder,
    fieldBorderRadius: radii.pill,
    stackedLabelColor: chrome.label,
    placeholderColor: chrome.placeholder,
    placeholderTextColor: chrome.placeholder,
  };
}
