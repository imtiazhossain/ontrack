import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('top safe-area invariant', () => {
  it('keeps the complete navigation tree inside the non-scrolling app shell', () => {
    const rootLayout = readFileSync(join(process.cwd(), 'src/app/_layout.tsx'), 'utf8');
    const appSafeArea = readFileSync(
      join(process.cwd(), 'src/components/primitives/app-safe-area.tsx'),
      'utf8',
    );
    const safeAreaChrome = readFileSync(
      join(process.cwd(), 'src/components/primitives/safe-area-chrome.tsx'),
      'utf8',
    );

    expect(rootLayout).toMatch(/<AppSafeArea(?:\s|>)/);
    expect(appSafeArea).toContain("edges={['top']}");
    expect(appSafeArea).toContain('SafeAreaChromeProvider');
    expect(safeAreaChrome).toContain('useSafeAreaChrome');
    expect(safeAreaChrome).toContain('priority');
    expect(safeAreaChrome).toContain('pickRankedEntry');
  });

  it('does not place the device top inset inside route content', () => {
    const screen = readFileSync(
      join(process.cwd(), 'src/components/primitives/screen.tsx'),
      'utf8',
    );
    expect(screen).not.toMatch(/paddingTop\s*:\s*.*insets\.top/);

    for (const file of routeFiles(join(process.cwd(), 'src/app'))) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/paddingTop\s*:\s*.*insets\.top/);
    }
  });
});
