import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('deferAfterPageLoad', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/utils/defer-after-page-load.ts'),
    'utf8',
  );

  it('waits for page settle then InteractionManager idle (no short fallback)', () => {
    expect(source).toContain('deferAfterPageTransition');
    expect(source).toContain('runAfterInteractions');
    expect(source).not.toContain('IDLE_FALLBACK');
    expect(source).not.toContain('setTimeout(run');
  });
});
