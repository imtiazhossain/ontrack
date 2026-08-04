import fs from 'node:fs';
import path from 'node:path';

describe('native image persistence', () => {
  it('normalizes all native picker URIs instead of retaining temporary content URIs', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/utils/image-persist.ts'),
      'utf8',
    );
    expect(source).toContain("Platform.OS !== 'web' && !uri.startsWith('ontrack-media:')");
    expect(source).not.toContain("!photoUri.startsWith('file://')");
  });
});
