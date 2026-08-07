/** `light` = white header ink; `dark` = black header ink. */
export type TravelAtmosphereHeaderInk = 'light' | 'dark';

type ResolveHeaderInkArgs = {
  themeDark: boolean;
  /** Average / dominant plate color when known (Unsplash / curated). */
  averageColor?: string;
  /** Explicit curated plate tone — used only when no sample color. */
  curatedTone?: TravelAtmosphereHeaderInk;
};

/** Cool Travel wash fallback when the plate has no sampled color. */
const SOLO_SHADOW_FALLBACK_RGB = { r: 17, g: 74, b: 110 } as const;

/** Parse `#RRGGBB` / `#RGB` into 0–255 channels. */
export function parseHexRgb(
  hex: string,
): { r: number; g: number; b: number } | undefined {
  const raw = hex.trim().replace(/^#/, '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return undefined;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/** Relative luminance 0–1 from `#RRGGBB` / `#RGB`. */
export function relativeLuminanceFromHex(hex: string): number | undefined {
  const rgb = parseHexRgb(hex);
  if (!rgb) return undefined;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Bottom-biased card shadow tinted by the Travel home atmosphere plate.
 * Used when only one trip is on the launcher so the card still grounds on
 * empty page paper (multi-trip stacks already provide visual weight).
 */
export function travelHomeSoloTripCardShadow(options: {
  averageColor?: string;
  dark: boolean;
}): string {
  if (options.dark) {
    return '0 18px 42px rgba(0,0,0,0.55), 0 6px 16px rgba(0,0,0,0.38)';
  }
  const sampled = options.averageColor
    ? parseHexRgb(options.averageColor)
    : undefined;
  // Fallback is already a cool Travel wash shadow; sampled sky plates need
  // a pull toward ink so the cast still reads on white page paper.
  const rgb = sampled
    ? {
        r: Math.round(sampled.r * 0.32),
        g: Math.round(sampled.g * 0.4),
        b: Math.round(sampled.b * 0.52),
      }
    : SOLO_SHADOW_FALLBACK_RGB;
  return `0 18px 40px rgba(${rgb.r},${rgb.g},${rgb.b},0.3), 0 6px 14px rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`;
}

/**
 * Only clearly bright washes keep black ink. Midtones / dark plates → white
 * (header sits on busy photo bands where black disappears).
 */
export function headerInkFromLuminance(
  luminance: number,
): TravelAtmosphereHeaderInk {
  return luminance > 0.68 ? 'dark' : 'light';
}

/**
 * Pick white vs black header ink from the live atmosphere plate.
 * Default is white — black only when a sampled color is clearly bright.
 */
export function resolveAtmosphereHeaderInk({
  themeDark,
  averageColor,
  curatedTone,
}: ResolveHeaderInkArgs): TravelAtmosphereHeaderInk {
  if (themeDark) return 'light';

  if (averageColor) {
    const luma = relativeLuminanceFromHex(averageColor);
    if (luma !== undefined) {
      if (luma > 0.68) return 'dark';
      if (luma < 0.5) return 'light';
      // Mid band — honor curated tone when the plate author pinned one.
      if (curatedTone) return curatedTone;
      return 'light';
    }
  }

  if (curatedTone) return curatedTone;

  // Unknown remote / wiki plate with no sample — white is the safe default.
  return 'light';
}

export function atmosphereHeaderInkColors(tone: TravelAtmosphereHeaderInk): {
  ink: string;
  muted: string;
} {
  if (tone === 'light') {
    return { ink: '#FFFFFF', muted: 'rgba(255,255,255,0.82)' };
  }
  return { ink: '#000000', muted: '#1A1A1A' };
}
