import type { ViewStyle } from 'react-native';

/** Soft, warm shadows — quiet paper depth matching the editorial card system. */
export const shadows: Record<'card' | 'raised' | 'overlay', ViewStyle> = {
  card: {
    boxShadow: '0 4px 18px rgba(51, 39, 28, 0.07)',
  },
  raised: {
    boxShadow: '0 8px 26px rgba(51, 39, 28, 0.12)',
  },
  overlay: {
    boxShadow: '0 14px 38px rgba(27, 24, 21, 0.20)',
  },
};
