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

  it('keeps frosted dock chrome with a transparent centered capsule', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/navigation/floating-tab-bar.tsx'),
      'utf8',
    );

    expect(source).toContain('BlurView');
    expect(source).toContain("backgroundColor: 'transparent'");
    expect(source).toMatch(/capsule:\s*\{[^}]*justifyContent:\s*'center'/);
    expect(source).toMatch(/railEdge:\s*\{[^}]*position:\s*'absolute'/);
    // Clip the carousel track only — never the dock blur underlay.
    expect(source).toMatch(/capsuleClip[\s\S]*overflow:\s*'hidden'/);
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
