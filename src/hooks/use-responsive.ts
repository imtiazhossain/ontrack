import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import {
  MAX_SCALE,
  MIN_SCALE,
  moderateScale,
  scaleSize,
  scaleTypographyToken,
  windowScale,
} from '@/design-system/responsive';
import { iconSizes as baseIconSizes, layout as baseLayout, spacing as baseSpacing } from '@/design-system/spacing';
import { typography as baseTypography } from '@/design-system/typography';

type TypographyScale = {
  [K in keyof typeof baseTypography]: {
    -readonly [P in keyof (typeof baseTypography)[K]]: (typeof baseTypography)[K][P];
  };
};

type SpacingScale = {
  [K in keyof typeof baseSpacing]: number;
};

type LayoutScale = {
  [K in keyof typeof baseLayout]: number;
};

type IconSizeScale = {
  [K in keyof typeof baseIconSizes]: number;
};

export interface ResponsiveTokens {
  /** Short side–biased width used for scaling (portrait-friendly). */
  width: number;
  /** Clamped width / BASE_WIDTH. */
  scale: number;
  /** Linear scale helper bound to the current window. */
  s: (size: number) => number;
  /** Moderate (dampened) scale for padding/gaps. */
  ms: (size: number, factor?: number) => number;
  typography: TypographyScale;
  spacing: SpacingScale;
  layout: LayoutScale;
  iconSizes: IconSizeScale;
}

function scaleRecord<T extends Record<string, number>>(
  record: T,
  map: (value: number) => number,
): { [K in keyof T]: number } {
  const next = {} as { [K in keyof T]: number };
  for (const key of Object.keys(record) as (keyof T)[]) {
    next[key] = map(record[key]);
  }
  return next;
}

/**
 * Screen-aware design tokens. Prefer this (or AppText / Button / Input /
 * Screen) over hard-coded fontSize / padding so compact phones don't wrap
 * chrome labels or overflow controls.
 */
export function useResponsive(): ResponsiveTokens {
  const { width, height } = useWindowDimensions();
  // Prefer the narrower edge so landscape doesn't inflate type/chrome.
  const layoutWidth = Math.min(width, height);

  return useMemo(() => {
    const scale = windowScale(layoutWidth);
    const s = (size: number) => scaleSize(size, layoutWidth);
    const ms = (size: number, factor = 0.45) => moderateScale(size, layoutWidth, factor);

    const typography = Object.fromEntries(
      (Object.keys(baseTypography) as (keyof typeof baseTypography)[]).map((key) => [
        key,
        scaleTypographyToken(baseTypography[key], layoutWidth),
      ]),
    ) as TypographyScale;

    return {
      width: layoutWidth,
      scale,
      s,
      ms,
      typography,
      spacing: scaleRecord(baseSpacing, ms) as SpacingScale,
      layout: {
        screenPadding: ms(baseLayout.screenPadding),
        maxContentWidth: baseLayout.maxContentWidth,
        minTapTarget: Math.max(44, s(baseLayout.minTapTarget)),
        tabBarInset: ms(baseLayout.tabBarInset),
        floatingTabBarBaseHeight: ms(baseLayout.floatingTabBarBaseHeight),
      } satisfies LayoutScale,
      iconSizes: scaleRecord(baseIconSizes, s) as IconSizeScale,
    };
  }, [layoutWidth]);
}

export { MAX_SCALE, MIN_SCALE, windowScale, scaleSize, moderateScale };
