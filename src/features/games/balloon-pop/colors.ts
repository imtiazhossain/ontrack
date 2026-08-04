import { categoryPalette } from '@/design-system';

import type { BalloonColorDef, BalloonColorId } from './types';

export const BALLOON_COLORS: readonly BalloonColorDef[] = [
  {
    id: 'red',
    label: 'Red',
    light: categoryPalette.gym.light,
    dark: categoryPalette.gym.dark,
  },
  {
    id: 'blue',
    label: 'Blue',
    light: categoryPalette.work.light,
    dark: categoryPalette.work.dark,
  },
  {
    id: 'green',
    label: 'Green',
    light: categoryPalette.personal.light,
    dark: categoryPalette.personal.dark,
  },
  {
    id: 'yellow',
    label: 'Yellow',
    light: '#D9A441',
    dark: '#E8C15A',
  },
  {
    id: 'purple',
    label: 'Purple',
    light: categoryPalette.mindfulness.light,
    dark: categoryPalette.mindfulness.dark,
  },
] as const;

const BY_ID = new Map(BALLOON_COLORS.map((color) => [color.id, color]));

export function balloonColor(id: BalloonColorId): BalloonColorDef {
  const color = BY_ID.get(id);
  if (!color) throw new Error(`Unknown balloon color: ${id}`);
  return color;
}

export function balloonFill(id: BalloonColorId, darkMode: boolean): string {
  const color = balloonColor(id);
  return darkMode ? color.dark : color.light;
}
