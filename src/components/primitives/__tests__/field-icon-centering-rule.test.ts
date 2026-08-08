import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIELD_PRIMITIVES = [
  'src/components/primitives/stacked-icon-field.tsx',
  'src/components/primitives/input.tsx',
  'src/components/primitives/date-field.tsx',
  'src/components/primitives/time-field.ios.tsx',
  'src/components/android/material-time-field.tsx',
] as const;

describe('field leading-icon centering invariant', () => {
  it('uses the shared row helper in every field primitive', () => {
    for (const relative of FIELD_PRIMITIVES) {
      const source = readFileSync(join(process.cwd(), relative), 'utf8');
      expect(source).toContain('fieldLeadingIconRowStyle');
      expect(source).not.toMatch(/alignItems:\s*stacked\s*\?\s*['"]flex-start['"]/);
      expect(source).not.toMatch(/paddingTop:\s*s\(2\)/);
    }
  });

  it('pins compact stacked values to the icon plate bottom', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/primitives/stacked-icon-field.tsx'),
      'utf8',
    );
    expect(source).toContain('pinValueToIconBottom');
    expect(source).toContain('fieldLeadingIconPlateSize');
    expect(source).toContain('space-between');
  });

  it('exports the shared helper from primitives', () => {
    const primitives = readFileSync(
      join(process.cwd(), 'src/components/primitives/index.ts'),
      'utf8',
    );
    expect(primitives).toContain('fieldLeadingIconRowStyle');
    expect(primitives).toContain('FieldLeadingIcon');
    expect(primitives).toContain('StackedIconField');
    expect(primitives).toContain('stackedIconFieldLayout');
  });
});
