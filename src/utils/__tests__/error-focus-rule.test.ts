import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('inline error focus invariant', () => {
  it('focuses and announces the shared error message', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/primitives/error-message.tsx'),
      'utf8',
    );
    const primitives = readFileSync(
      join(process.cwd(), 'src/components/primitives/index.ts'),
      'utf8',
    );

    expect(source).toContain('AccessibilityInfo.setAccessibilityFocus');
    expect(source).toContain('AccessibilityInfo.announceForAccessibility');
    expect(source).toContain('accessibilityLiveRegion="assertive"');
    expect(source).toContain('accessibilityRole="alert"');
    expect(primitives).toContain("export { ErrorMessage } from './error-message';");
  });

  it('does not render dynamic error state as unfocused danger text', () => {
    const files = [
      ...tsxFiles(join(process.cwd(), 'src/app')),
      ...tsxFiles(join(process.cwd(), 'src/features')),
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(
        /\{(?:\w*Error|error)\s*\?\s*<AppText[^>]*color=["']danger["']/,
      );
    }
  });
});
