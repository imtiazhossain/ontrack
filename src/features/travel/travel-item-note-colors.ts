import type { Theme } from '@/design-system';
import { TRAVEL_EXPENSE_SELF_ID } from '@/features/travel/types';

/** Vision-board jewel palette for collaborative note authors. */
const NOTE_AUTHOR_COLORS_LIGHT = [
  '#9A7654',
  '#4A7399',
  '#52745A',
  '#A85661',
  '#746393',
  '#9A7040',
  '#2F8A8A',
  '#D45B4A',
] as const;

const NOTE_AUTHOR_COLORS_DARK = [
  '#C4A07A',
  '#7FA3C4',
  '#7A9A80',
  '#C4848C',
  '#9A8BB0',
  '#C4A070',
  '#6FAEBB',
  '#E07A6A',
] as const;

function hashAuthorId(authorId: string): number {
  let hash = 0;
  for (let i = 0; i < authorId.length; i += 1) {
    hash = (hash * 31 + authorId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable accent color for a note author (self + friends). */
export function noteAuthorColor(authorId: string, theme: Theme): string {
  const palette =
    theme.name === 'dark' ? NOTE_AUTHOR_COLORS_DARK : NOTE_AUTHOR_COLORS_LIGHT;
  if (authorId === TRAVEL_EXPENSE_SELF_ID) return palette[0]!;
  return palette[hashAuthorId(authorId) % palette.length]!;
}

/** Soft tint behind avatar / author chips. */
export function noteAuthorTint(authorId: string, theme: Theme): string {
  const color = noteAuthorColor(authorId, theme);
  return theme.name === 'dark' ? `${color}33` : `${color}22`;
}
