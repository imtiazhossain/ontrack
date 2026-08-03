import type { Theme } from '@/design-system';

/** Exact Add-to-Timeline sheet surfaces for light + dark mockups. */
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
  icons: {
    import: { bg: string; fg: string };
    lodging: { bg: string; fg: string };
    location: { bg: string; fg: string };
    calendar: { bg: string; fg: string };
    clock: { bg: string; fg: string };
    shield: { bg: string; fg: string };
    link: { bg: string; fg: string };
    flight: { bg: string; fg: string };
    note: { bg: string; fg: string };
    photo: { bg: string; fg: string };
    /** Soft purple — Expenses row. */
    expense: { bg: string; fg: string };
    /** Soft green — Currency row. */
    currency: { bg: string; fg: string };
    /** Warm brown — Group Chat row. */
    chat: { bg: string; fg: string };
  };
};

export function itinerarySheetChrome(theme: Theme): ItinerarySheetChrome {
  if (theme.name === 'dark') {
    return {
      sheetBg: '#141312',
      fieldBg: '#1C1A18',
      fieldBorder: 'rgba(255,255,255,0.06)',
      handle: '#3A3530',
      title: '#F0E6DA',
      subtitle: '#9A9086',
      label: '#EDE4DA',
      placeholder: '#8A8278',
      importTitle: '#D4A574',
      importSubtitle: '#9A9086',
      importActionBorder: 'rgba(212,165,116,0.45)',
      importActionBg: 'rgba(212,165,116,0.08)',
      closeBg: '#2A2622',
      closeIcon: '#D4A574',
      ctaFrom: '#D4A574',
      ctaTo: '#B8895A',
      ctaText: '#1A1410',
      icons: {
        import: { bg: 'rgba(212,165,116,0.18)', fg: '#D4A574' },
        lodging: { bg: 'rgba(196,140,110,0.18)', fg: '#E0B090' },
        location: { bg: 'rgba(180,150,120,0.16)', fg: '#C8B090' },
        calendar: { bg: 'rgba(170,100,90,0.18)', fg: '#D09080' },
        clock: { bg: 'rgba(200,160,90,0.16)', fg: '#D4B070' },
        shield: { bg: 'rgba(110,150,120,0.18)', fg: '#90C0A0' },
        link: { bg: 'rgba(120,150,170,0.18)', fg: '#90B0C8' },
        flight: { bg: 'rgba(120,150,180,0.18)', fg: '#90B0D0' },
        note: { bg: 'rgba(160,140,120,0.16)', fg: '#C0B0A0' },
        photo: { bg: 'rgba(160,140,120,0.16)', fg: '#C0B0A0' },
        expense: { bg: 'rgba(160,130,170,0.18)', fg: '#C0A0C8' },
        currency: { bg: 'rgba(110,150,120,0.18)', fg: '#90C0A0' },
        chat: { bg: 'rgba(160,120,90,0.18)', fg: '#D0B090' },
      },
    };
  }

  return {
    sheetBg: '#FCF9F5',
    fieldBg: '#F3EEE7',
    fieldBorder: 'rgba(51,39,28,0.06)',
    handle: '#C4BBB0',
    title: '#2D1C13',
    subtitle: '#8A7A6C',
    label: '#3D3229',
    placeholder: '#A38D7D',
    importTitle: '#2D1C13',
    importSubtitle: '#8A7A6C',
    importActionBorder: 'rgba(51,39,28,0.14)',
    importActionBg: '#FCF9F5',
    closeBg: '#EFE8DF',
    closeIcon: '#5C4E42',
    ctaFrom: '#A07850',
    ctaTo: '#825F3F',
    ctaText: '#FFF9F2',
    icons: {
      import: { bg: '#EFE6DA', fg: '#7A5A3A' },
      lodging: { bg: '#F0E0D4', fg: '#9A6A50' },
      location: { bg: '#E8DFD2', fg: '#8A7058' },
      calendar: { bg: '#EAD8D0', fg: '#9A6050' },
      clock: { bg: '#EDE0C8', fg: '#A08040' },
      shield: { bg: '#DCE6DC', fg: '#5A7A60' },
      link: { bg: '#DCE4EA', fg: '#5A7080' },
      flight: { bg: '#D8E4EE', fg: '#4A6A88' },
      note: { bg: '#E8E2D8', fg: '#6E675E' },
      photo: { bg: '#E8E2D8', fg: '#6E675E' },
      expense: { bg: '#E6DCE8', fg: '#7A6088' },
      currency: { bg: '#DCE8DC', fg: '#5A7A60' },
      chat: { bg: '#E6D8C8', fg: '#6B5344' },
    },
  };
}

export type SheetIconTone = keyof ItinerarySheetChrome['icons'];

/** Shared stacked-field colors used by Add Stay and structured travel editors. */
export function itinerarySheetFieldProps(
  chrome: ItinerarySheetChrome,
  tone: SheetIconTone,
) {
  const icon = chrome.icons[tone];
  return {
    iconBackground: icon.bg,
    iconColor: icon.fg,
    fieldBackground: chrome.fieldBg,
    stackedLabelColor: chrome.label,
    placeholderColor: chrome.placeholder,
    placeholderTextColor: chrome.placeholder,
  };
}
