import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { globSync } from 'glob';

const NUMERIC_KEYBOARD =
  /keyboardType=["'](?:decimal-pad|number-pad|numeric)["']/;

describe('numeric input rule', () => {
  it('sanitizes number keyboards in the shared Input primitive', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/primitives/input.tsx'),
      'utf8',
    );
    expect(source).toContain("from '@/utils/parse'");
    expect(source).toContain('formatNumericInput');
    expect(source).toMatch(/keyboardType === ['"]number-pad['"]/);
    expect(source).toMatch(/keyboardType === ['"]decimal-pad['"]/);
  });

  it('requires shared sanitizers on raw number TextInputs', () => {
    const appSource = join(process.cwd(), 'src');
    const files = globSync('**/*.{ts,tsx}', {
      cwd: appSource,
      absolute: true,
      ignore: [
        '**/__tests__/**',
        '**/components/primitives/input.tsx',
      ],
    });

    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const blocks = source.match(/<TextInput\b[\s\S]*?(?:\/>|<\/TextInput>)/g) ?? [];
      for (const block of blocks) {
        if (!NUMERIC_KEYBOARD.test(block)) continue;
        if (
          /numericOnChangeText\s*\(/.test(block) ||
          /sanitizeNumericInput\s*\(/.test(block)
        ) {
          continue;
        }
        offenders.push(file.replace(`${process.cwd()}/`, ''));
      }
    }

    expect(offenders).toEqual([]);
  });
});
