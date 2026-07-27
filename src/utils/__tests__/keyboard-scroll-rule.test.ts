import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('keyboard scrolling invariant', () => {
  it('keeps shared scrollable screens usable above the keyboard', () => {
    const screen = readFileSync(
      join(process.cwd(), 'src/components/primitives/screen.tsx'),
      'utf8',
    );

    expect(screen).toContain('automaticallyAdjustKeyboardInsets');
    expect(screen).toContain('keyboardShouldPersistTaps="handled"');
    expect(screen).toContain("Platform.OS === 'ios' ? 'interactive' : 'on-drag'");
    expect(screen).toContain('scrollContent: { flexGrow: 1 }');
  });

  it('preserves the non-scrolling top safe-area ownership', () => {
    const screen = readFileSync(
      join(process.cwd(), 'src/components/primitives/screen.tsx'),
      'utf8',
    );

    expect(screen).toContain('contentInsetAdjustmentBehavior="never"');
    expect(screen).not.toMatch(/paddingTop\s*:\s*.*insets\.top/);
  });
});
