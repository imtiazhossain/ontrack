import { Platform } from 'react-native';

import { typeConfig } from './typography';

export type FontRole = 'ui' | 'mono';

export type FontPreset = {
  id: string;
  label: string;
  /** Platform font family string for Text / AppText. */
  family: string;
  role: FontRole;
};

function family(ios: string, android: string, web: string): string {
  return Platform.select({ ios, android, web, default: android }) as string;
}

/** Curated, platform-safe UI faces for the Design System editor. */
export const UI_FONT_PRESETS: readonly FontPreset[] = [
  {
    id: 'system-serif',
    label: 'System Serif',
    family: typeConfig.fontFamily,
    role: 'ui',
  },
  {
    id: 'system-sans',
    label: 'System Sans',
    family: family('System', 'sans-serif', 'system-ui, -apple-system, sans-serif'),
    role: 'ui',
  },
  {
    id: 'system-rounded',
    label: 'System Rounded',
    family: family('ui-rounded', 'sans-serif', 'ui-rounded, system-ui, sans-serif'),
    role: 'ui',
  },
  {
    id: 'georgia',
    label: 'Georgia',
    family: family('Georgia', 'serif', 'Georgia, "Times New Roman", serif'),
    role: 'ui',
  },
  {
    id: 'times',
    label: 'Times New Roman',
    family: family('Times New Roman', 'serif', '"Times New Roman", Times, serif'),
    role: 'ui',
  },
  {
    id: 'palatino',
    label: 'Palatino',
    family: family('Palatino', 'serif', 'Palatino, "Palatino Linotype", serif'),
    role: 'ui',
  },
  {
    id: 'helvetica',
    label: 'Helvetica Neue',
    family: family('Helvetica Neue', 'sans-serif', '"Helvetica Neue", Helvetica, Arial, sans-serif'),
    role: 'ui',
  },
  {
    id: 'arial',
    label: 'Arial',
    family: family('Arial', 'sans-serif', 'Arial, Helvetica, sans-serif'),
    role: 'ui',
  },
] as const;

/** Curated mono faces for code / technical chrome. */
export const MONO_FONT_PRESETS: readonly FontPreset[] = [
  {
    id: 'system-mono',
    label: 'System Mono',
    family: typeConfig.monoFamily,
    role: 'mono',
  },
  {
    id: 'menlo',
    label: 'Menlo',
    family: family('Menlo', 'monospace', 'Menlo, Monaco, monospace'),
    role: 'mono',
  },
  {
    id: 'courier',
    label: 'Courier',
    family: family('Courier', 'monospace', 'Courier, "Courier New", monospace'),
    role: 'mono',
  },
  {
    id: 'courier-new',
    label: 'Courier New',
    family: family('Courier New', 'monospace', '"Courier New", Courier, monospace'),
    role: 'mono',
  },
] as const;

export const DEFAULT_UI_FONT_PRESET_ID = 'system-serif';
export const DEFAULT_MONO_FONT_PRESET_ID = 'system-mono';

export type FontOverrides = {
  /** UI preset id, or null for shipped default. */
  ui: string | null;
  /** Mono preset id, or null for shipped default. */
  mono: string | null;
};

export function emptyFontOverrides(): FontOverrides {
  return { ui: null, mono: null };
}

export function uiFontPresets(): readonly FontPreset[] {
  return UI_FONT_PRESETS;
}

export function monoFontPresets(): readonly FontPreset[] {
  return MONO_FONT_PRESETS;
}

export function findFontPreset(role: FontRole, id: string | null | undefined): FontPreset | undefined {
  if (!id) return undefined;
  const list = role === 'mono' ? MONO_FONT_PRESETS : UI_FONT_PRESETS;
  return list.find((preset) => preset.id === id);
}

export function defaultFontPreset(role: FontRole): FontPreset {
  return role === 'mono'
    ? MONO_FONT_PRESETS.find((p) => p.id === DEFAULT_MONO_FONT_PRESET_ID) ?? MONO_FONT_PRESETS[0]!
    : UI_FONT_PRESETS.find((p) => p.id === DEFAULT_UI_FONT_PRESET_ID) ?? UI_FONT_PRESETS[0]!;
}

export function resolveFontPreset(role: FontRole, id: string | null | undefined): FontPreset {
  return findFontPreset(role, id) ?? defaultFontPreset(role);
}

export function resolveActiveFontFamilies(overrides?: FontOverrides | null): {
  fontFamily: string;
  monoFamily: string;
} {
  return {
    fontFamily: resolveFontPreset('ui', overrides?.ui ?? null).family,
    monoFamily: resolveFontPreset('mono', overrides?.mono ?? null).family,
  };
}

export function sanitizeFontOverrides(value: unknown): FontOverrides {
  const empty = emptyFontOverrides();
  if (!value || typeof value !== 'object') return empty;
  const source = value as Record<string, unknown>;
  const ui = typeof source.ui === 'string' ? source.ui : null;
  const mono = typeof source.mono === 'string' ? source.mono : null;
  return {
    ui: findFontPreset('ui', ui) ? ui : null,
    mono: findFontPreset('mono', mono) ? mono : null,
  };
}

export const FONT_ROLE_LABELS: Record<FontRole, string> = {
  ui: 'UI font',
  mono: 'Mono font',
};
