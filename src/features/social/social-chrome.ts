import type { Theme } from '@/design-system';
import type { ViewStyle } from 'react-native';

export type SocialChrome = {
  background: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  primaryDeep: string;
  mint: string;
  mintStrong: string;
  border: string;
  ink: string;
  secondaryInk: string;
  shadow: string;
};

type SocialShadowLevel = 'card' | 'raised' | 'overlay';

const socialShadowMetrics: Record<SocialShadowLevel, Pick<ViewStyle, 'shadowOffset' | 'shadowOpacity' | 'shadowRadius'>> = {
  card: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24 },
  raised: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 28 },
  overlay: { shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 32 },
};

/** Native shadow tokens that retain Social's theme-aware shadow color. */
export function socialShadow(color: string, level: SocialShadowLevel = 'card'): ViewStyle {
  return { shadowColor: color, ...socialShadowMetrics[level] };
}

/** Feature-scoped semantic colors for the calm green Social identity. */
export function socialChrome(theme: Theme): SocialChrome {
  if (theme.name === 'dark') {
    return {
      background: '#111A17',
      surface: '#19241F',
      surfaceMuted: '#202D27',
      primary: '#7BC29D',
      primaryDeep: '#9BD2B3',
      mint: '#223C30',
      mintStrong: '#315C48',
      border: '#2C4036',
      ink: theme.textPrimary,
      secondaryInk: theme.textSecondary,
      shadow: 'rgba(0, 0, 0, 0.28)',
    };
  }

  return {
    background: '#FBFCFA',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F8F5',
    primary: '#2E7D5A',
    primaryDeep: '#174D3E',
    mint: '#E8F3EC',
    mintStrong: '#CFE6D8',
    border: '#E7EBE8',
    ink: '#153633',
    secondaryInk: '#72807D',
    shadow: 'rgba(24, 60, 47, 0.08)',
  };
}

export const socialActionTones = {
  trip: { foreground: '#3E8B65', background: '#E5F1E9' },
  challenge: { foreground: '#8060D4', background: '#EEE9FB' },
  calendar: { foreground: '#ED852E', background: '#FFF0DF' },
  tasks: { foreground: '#538DDE', background: '#E7F0FD' },
  chat: { foreground: '#4B9D73', background: '#E4F2E9' },
  workout: { foreground: '#4B88DD', background: '#E7F0FC' },
  photos: { foreground: '#DF4F78', background: '#FCE7EE' },
  story: { foreground: '#EE862D', background: '#FFF0DF' },
  poll: { foreground: '#8A5CD5', background: '#EEE7FA' },
  group: { foreground: '#347B58', background: '#E4F0E8' },
} as const;
