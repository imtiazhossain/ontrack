import { appTextStyle, fontFamilies, typeConfig, typography } from '@/design-system/typography';

describe('typeConfig + appTextStyle', () => {
  it('uses one UI font for sans/serif aliases', () => {
    expect(fontFamilies.sans).toBe(typeConfig.fontFamily);
    expect(fontFamilies.serif).toBe(typeConfig.fontFamily);
    expect(fontFamilies.rounded).toBe(typeConfig.fontFamily);
    expect(fontFamilies.mono).toBe(typeConfig.monoFamily);
  });

  it('keeps every type scale token on regular weight by default', () => {
    for (const token of Object.values(typography)) {
      expect(token.fontWeight).toBe(typeConfig.weight.regular);
    }
  });

  it('only applies bold when explicitly requested', () => {
    expect(appTextStyle('callout').fontWeight).toBe(typeConfig.weight.regular);
    expect(appTextStyle('callout', { bold: true }).fontWeight).toBe(typeConfig.weight.bold);
    expect(appTextStyle('callout', { bold: false }).fontWeight).toBe(typeConfig.weight.regular);
  });

  it('keeps mono on the mono family', () => {
    expect(appTextStyle('mono').fontFamily).toBe(typeConfig.monoFamily);
    expect(appTextStyle('body').fontFamily).toBe(typeConfig.fontFamily);
  });
});
