import {
  DEFAULT_UI_FONT_PRESET_ID,
  emptyFontOverrides,
  findFontPreset,
  resolveActiveFontFamilies,
  sanitizeFontOverrides,
  UI_FONT_PRESETS,
} from '@/design-system/font-presets';
import { typeConfig } from '@/design-system/typography';

describe('font presets', () => {
  it('resolves shipped UI/mono faces by default', () => {
    expect(resolveActiveFontFamilies(emptyFontOverrides())).toEqual({
      fontFamily: typeConfig.fontFamily,
      monoFamily: typeConfig.monoFamily,
    });
    expect(findFontPreset('ui', DEFAULT_UI_FONT_PRESET_ID)?.family).toBe(typeConfig.fontFamily);
  });

  it('sanitizes unknown preset ids', () => {
    expect(sanitizeFontOverrides({ ui: 'georgia', mono: 'nope' })).toEqual({
      ui: 'georgia',
      mono: null,
    });
    expect(UI_FONT_PRESETS.some((preset) => preset.id === 'georgia')).toBe(true);
  });
});
