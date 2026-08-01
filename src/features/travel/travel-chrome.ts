import type { TextStyle } from 'react-native';

/**
 * Design-system overlines force uppercase. Travel chrome uses Title Case instead.
 */
export const travelOverlineStyle: TextStyle = { textTransform: 'none' };

export function titleCaseTravelKind(kind: string): string {
  if (!kind) return kind;
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}
