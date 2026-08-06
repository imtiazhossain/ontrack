import { appIcons, appIconSections, type AppIconName } from '@/design-system/icons';

describe('appIconSections', () => {
  it('covers every app icon exactly once', () => {
    const seen = new Set<string>();
    for (const section of appIconSections) {
      for (const name of section.icons) {
        expect(appIcons[name as AppIconName]).toBeDefined();
        expect(seen.has(name)).toBe(false);
        seen.add(name);
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(appIcons).sort());
  });
});
