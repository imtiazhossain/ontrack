import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('travel document reader build invariant', () => {
  it('does not crash travel screens when the optional native reader is absent', () => {
    const moduleSource = readFileSync(
      join(
        process.cwd(),
        'modules/travel-document-reader/src/TravelDocumentReaderModule.ts',
      ),
      'utf8',
    );
    const importSource = readFileSync(
      join(process.cwd(), 'src/features/travel/flight-confirmation-import.ts'),
      'utf8',
    );

    expect(moduleSource).toContain('requireOptionalNativeModule');
    expect(moduleSource).not.toMatch(/\brequireNativeModule\b/);
    expect(importSource).toContain('if (!TravelDocumentReader)');
  });

  it('keeps local native module sources in EAS build archives', () => {
    const easIgnore = readFileSync(join(process.cwd(), '.easignore'), 'utf8');

    expect(easIgnore).toContain('/ios/');
    expect(easIgnore).toContain('/android/');
    expect(easIgnore).not.toMatch(/^ios\/$/m);
    expect(easIgnore).not.toMatch(/^android\/$/m);
  });

  it('accepts confirmation screenshots from the native photo library', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/travel/flight-confirmation-import.ts'),
      'utf8',
    );
    const pickImageSource = readFileSync(
      join(process.cwd(), 'src/utils/pick-image.ts'),
      'utf8',
    );

    expect(source).toContain("from '@/utils/pick-image'");
    expect(source).toContain('pickLibraryImages');
    expect(source).toContain('allowsMultipleSelection: true');
    expect(source).toContain('selectionLimit: MAX_SCREENSHOTS');
    expect(source).toContain("source === 'screenshots'");
    expect(pickImageSource).toContain("mediaTypes: ['images']");
    expect(pickImageSource).toContain('allowsMultipleSelection');
  });
});
