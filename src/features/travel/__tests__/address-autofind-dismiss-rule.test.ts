import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('AddressAutofindField outside dismiss', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/features/travel/address-autofind-field.tsx'),
    'utf8',
  );

  it('uses the shared Dropdown overlay contract (Modal + tap-outside backdrop)', () => {
    expect(source).toContain('placeDropdownMenu');
    expect(source).toContain('<Modal');
    expect(source).toContain('StyleSheet.absoluteFill');
    expect(source).toContain('dismissMenu');
    expect(source).toContain('addressSuggestionsDismiss');
  });

  it('renders suggestions on frosted TravelHomeGlass, not solid elevated paper', () => {
    expect(source).toContain('<TravelHomeGlass');
    expect(source).not.toContain('backgroundColor: theme.backgroundElevated');
  });

  it('does not rely on TextInput blur alone to close suggestions', () => {
    expect(source).not.toMatch(/onBlur=\{\(\)\s*=>\s*\{[^}]*setOpen\(false\)/);
    expect(source).not.toMatch(/onBlur=\{\(\)\s*=>\s*setTimeout/);
  });

  it('keeps tap-outside dismiss closed until the user types again', () => {
    expect(source).toContain('suppressUntilTypedRef');
    expect(source).toMatch(/dismissMenu[\s\S]*suppressUntilTypedRef\.current = true/);
    expect(source).toMatch(
      /onChangeText[\s\S]*suppressUntilTypedRef\.current = false/,
    );
    // Focus must not reopen a dismissed menu for the same value.
    expect(source).not.toMatch(/onFocus=\{\(\)\s*=>\s*\{[^}]*measureAndOpen/);
    expect(source).toMatch(
      /searchAddresses[\s\S]*suppressUntilTypedRef\.current\) return/,
    );
  });
});
