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

  it('keeps the travel chat composer above the iOS keyboard', () => {
    const chatScreen = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-chat-screen.tsx'),
      'utf8',
    );

    expect(chatScreen).toContain("'keyboardWillChangeFrame'");
    expect(chatScreen).toContain('Keyboard.scheduleLayoutAnimation(event)');
    expect(chatScreen).toContain('marginBottom: keyboardInset');
    expect(chatScreen).not.toContain('<KeyboardAvoidingView');
  });
});
