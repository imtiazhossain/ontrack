import type { ViewStyle } from 'react-native';

/** Soft, warm shadows — depth should feel like paper layers, not floating glass. */
export const shadows: Record<'card' | 'raised' | 'overlay', ViewStyle> = {
  card: {
    shadowColor: '#3D3220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#3D3220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  overlay: {
    shadowColor: '#141210',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 12,
  },
};
