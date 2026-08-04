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

/** Minimum height for a stacked label + value at the active Dynamic Type scale. */
export function stackedFieldMinHeight({
  baseMinHeight,
  fontScale,
  labelLineHeight,
  valueLineHeight,
  verticalPadding,
  gap = 2,
}: {
  baseMinHeight: number;
  fontScale: number;
  labelLineHeight: number;
  valueLineHeight: number;
  verticalPadding: number;
  gap?: number;
}): number {
  const labelScale = Math.min(fontScale, 1.15);
  const valueScale = Math.min(fontScale, 1.3);
  return Math.max(
    baseMinHeight,
    Math.ceil(
      labelLineHeight * labelScale
        + valueLineHeight * valueScale
        + verticalPadding * 2
        + gap,
    ),
  );
}
