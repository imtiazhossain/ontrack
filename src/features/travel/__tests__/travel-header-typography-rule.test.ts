import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('travel section header typography', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/features/travel/travel-collapsible-section.tsx'),
    'utf8',
  );

  it('keeps compact nested labels at readable overline sizing', () => {
    expect(source).toContain("variant={compact && nested ? 'overline' : titleVariant}");
    expect(source).toContain('fitMinimumScale={compact && nested ? 0.9 : undefined}');
    expect(source).not.toMatch(/compactNestedTitle:\s*\{[^}]*fontSize/s);
  });
});
