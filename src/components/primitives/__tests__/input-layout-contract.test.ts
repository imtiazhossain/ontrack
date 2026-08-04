import fs from 'node:fs';
import path from 'node:path';

describe('Input layout contract', () => {
  it('allows empty stacked multiline fields to grow around their label and value', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/primitives/input.tsx'),
      'utf8',
    );

    expect(source).toMatch(
      /height:\s*multiline\s*\?\s*undefined\s*:\s*stacked\s*\?\s*undefined\s*:\s*minHeight/,
    );
    expect(source).not.toContain('multiline && hasValue');
    expect(source).toContain('multiline ? styles.stackedMultilineInput : null');
    expect(source).toMatch(
      /stackedMultilineInput:\s*\{[\s\S]*?flexGrow:\s*0,[\s\S]*?flexBasis:\s*'auto'/,
    );
    expect(source).toContain('paddingTop: typography.caption.lineHeight + 2');
  });
});
