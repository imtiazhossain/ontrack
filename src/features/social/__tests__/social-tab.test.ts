import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('social tab registration', () => {
  it('registers Social in the tabs layout and floating tab meta', () => {
    const tabsLayout = readFileSync(
      join(process.cwd(), 'src/app/(tabs)/_layout.tsx'),
      'utf8',
    );
    const tabBar = readFileSync(
      join(process.cwd(), 'src/components/navigation/floating-tab-bar.tsx'),
      'utf8',
    );

    expect(tabsLayout).toContain('name="social"');
    expect(tabBar).toContain("social: {");
    expect(tabBar).toContain("label: 'Social'");
    expect(tabBar).toContain("icon: 'people'");
    expect(tabBar).toContain("href: '/(tabs)/social'");
  });
});
