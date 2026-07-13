import { Easing } from 'react-native-reanimated';

export const durations = {
  fast: 160,
  base: 260,
  slow: 420,
  cinematic: 700,
} as const;

export const easings = {
  standard: Easing.bezier(0.3, 0, 0.15, 1),
  enter: Easing.bezier(0.16, 1, 0.3, 1),
  exit: Easing.bezier(0.6, 0, 0.9, 0.4),
} as const;

export const springs = {
  gentle: { damping: 22, stiffness: 200, mass: 1 },
  bouncy: { damping: 14, stiffness: 220, mass: 0.9 },
  stiff: { damping: 26, stiffness: 380, mass: 1 },
} as const;
