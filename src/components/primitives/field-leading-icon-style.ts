import type { ViewStyle } from 'react-native';

/**
 * Row layout for any control that hosts a leading field icon + label/value.
 * Leading icons must always be vertically centered in the field — never
 * top-aligned or nudged with paddingTop on stacked chrome.
 */
export function fieldLeadingIconRowStyle(
  overrides?: Omit<ViewStyle, 'alignItems' | 'flexDirection'>,
): ViewStyle {
  return {
    ...overrides,
    flexDirection: 'row',
    alignItems: 'center',
  };
}
