import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

describe('button leading/label alignment invariant', () => {
  it('keeps Button as a simple row center — no labelSlot / translateY optical hacks', () => {
    const button = read('src/components/primitives/button.tsx');

    expect(button).toMatch(/base:\s*\{[^}]*alignItems:\s*['"]center['"]/s);
    expect(button).toContain('<AppText');
    expect(button).toContain('numberOfLines={1}');
    // Self-sized Button labels must not use AppText fit (Android truncates e.g. "Add Activity").
    expect(button).not.toMatch(/<AppText\b[^>]*\bfit\b/);
    expect(button).not.toContain('labelSlot');
    expect(button).not.toContain('leadingHeight');
    expect(button).not.toContain('translateY');
    expect(button).not.toContain('usesBuiltInLeadingSlot');
    expect(button).toContain("labelText !== ''");
    expect(button).toContain('fieldTitleCase');
  });

  it('keeps Travel action icon+label on one centered row without optical nudges', () => {
    const actions = read('src/features/travel/travel-list-actions.tsx');

    expect(actions).toMatch(/actionContent:\s*\{[^}]*alignItems:\s*['"]center['"]/s);
    expect(actions).toMatch(/actionContent:\s*\{[^}]*flexDirection:\s*['"]row['"]/s);
    expect(actions).toMatch(/actionIcon:\s*\{[^}]*alignItems:\s*['"]center['"]/s);
    expect(actions).toMatch(/actionIcon:\s*\{[^}]*justifyContent:\s*['"]center['"]/s);
    // Grid tiles left-align via actionGlass; wide CTAs center at the Pressable glass layer.
    expect(actions).toMatch(/actionGlass:\s*\{[^}]*justifyContent:\s*['"]flex-start['"]/s);
    expect(actions).toMatch(
      /justifyContent:\s*wide\s*\?\s*['"]center['"]\s*:\s*['"]flex-start['"]/,
    );
    expect(actions).toContain('styles.actionContent');
    expect(actions).toContain('fieldTitleCase');
    expect(actions).not.toContain('translateY');
  });
});
