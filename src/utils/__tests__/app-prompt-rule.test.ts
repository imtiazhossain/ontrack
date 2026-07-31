import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { globSync } from 'glob';

describe('app prompt rule', () => {
  it('keeps app-owned prompts on the shared branded prompt system', () => {
    const appSource = join(process.cwd(), 'src');
    const files = globSync('**/*.{ts,tsx}', {
      cwd: appSource,
      absolute: true,
      ignore: [
        '**/__tests__/**',
        '**/components/primitives/app-prompt.tsx',
      ],
    });

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/\bAlert\.alert\s*\(/);
      expect(source).not.toMatch(/\bActionSheetIOS\b/);
    }
  });
});
