import { Platform } from 'react-native';

export const fontFamilies = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export type TypeVariant = keyof typeof typography;

/**
 * Editorial type scale: serif display faces for headlines and dates,
 * the system sans for body and UI chrome.
 */
export const typography = {
  display: { fontFamily: fontFamilies.serif, fontSize: 40, lineHeight: 46, fontWeight: '600' },
  title: { fontFamily: fontFamilies.serif, fontSize: 30, lineHeight: 36, fontWeight: '600' },
  heading: { fontFamily: fontFamilies.serif, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  subheading: { fontFamily: fontFamilies.sans, fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontFamily: fontFamilies.sans, fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyMedium: { fontFamily: fontFamilies.sans, fontSize: 16, lineHeight: 23, fontWeight: '500' },
  callout: { fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  caption: { fontFamily: fontFamilies.sans, fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  overline: {
    fontFamily: fontFamilies.sans,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  metric: { fontFamily: fontFamilies.serif, fontSize: 34, lineHeight: 40, fontWeight: '600' },
  mono: { fontFamily: fontFamilies.mono, fontSize: 13, lineHeight: 18, fontWeight: '500' },
} as const;
