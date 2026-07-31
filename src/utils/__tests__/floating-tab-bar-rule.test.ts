import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('floating tab bar background invariant', () => {
  it('keeps the navigator chrome transparent behind the floating menu', () => {
    const tabsLayout = readFileSync(
      join(process.cwd(), 'src/app/(tabs)/_layout.tsx'),
      'utf8',
    );

    expect(tabsLayout).toContain("backgroundColor: 'transparent'");
    expect(tabsLayout).toMatch(/elevation:\s*0/);
    expect(tabsLayout).toMatch(/shadowOpacity:\s*0/);
    expect(tabsLayout).toMatch(/shadowColor:\s*'transparent'/);
    expect(tabsLayout).toMatch(/tabBarBackground:\s*\(\)\s*=>\s*null/);
  });

  it('keeps the dock transparent and the capsule on a soft copper glow', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/navigation/floating-tab-bar.tsx'),
      'utf8',
    );

    expect(source).toContain("backgroundColor: 'transparent'");

    const capsuleIndex = source.indexOf('styles.capsule');
    expect(capsuleIndex).toBeGreaterThan(-1);

    const capsuleBlock = source.slice(
      capsuleIndex,
      source.indexOf('}>', capsuleIndex),
    );
    expect(capsuleBlock).not.toMatch(/shadowOpacity/);
    expect(capsuleBlock).not.toMatch(/elevation/);
    expect(capsuleBlock).toMatch(
      /boxShadow:\s*theme\.name === 'dark'\s*\?\s*'0 8px 28px rgba\(177, 138, 101, 0\.32\)'\s*:\s*'0 5px 22px rgba\(154, 118, 84, 0\.22\)'/,
    );
    // overflow:hidden on the shadowed capsule clips the glow — clip inner only.
    expect(source).toMatch(/capsuleClip[\s\S]*overflow:\s*'hidden'/);
    expect(source).toMatch(
      /capsule:\s*\{[^}]*borderRadius:\s*radii\.xl[^}]*\}/,
    );
    expect(source).not.toMatch(
      /capsule:\s*\{[^}]*overflow:\s*'hidden'/,
    );
  });

  it('does not leave a Screen bottom-inset plate on checklist detail', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/todos/todo-list-screen.tsx'),
      'utf8',
    );

    expect(source).toMatch(
      /<Screen[\s\S]*?bottomInset=\{false\}[\s\S]*?contentStyle=\{styles\.screenContent\}/,
    );
  });
});
