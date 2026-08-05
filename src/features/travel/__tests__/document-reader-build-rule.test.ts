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
    const flightImportSource = readFileSync(
      join(process.cwd(), 'src/features/travel/flight-confirmation-import.ts'),
      'utf8',
    );
    const rentalImportSource = readFileSync(
      join(process.cwd(), 'src/features/travel/rental-confirmation-import.ts'),
      'utf8',
    );

    expect(moduleSource).toContain('requireOptionalNativeModule');
    expect(moduleSource).not.toMatch(/\brequireNativeModule\b/);
    expect(flightImportSource).toContain('if (!TravelDocumentReader)');
    expect(rentalImportSource).toContain('if (!TravelDocumentReader)');
  });

  it('keeps local native module sources in EAS build archives', () => {
    const easIgnore = readFileSync(join(process.cwd(), '.easignore'), 'utf8');

    expect(easIgnore).toContain('/ios/');
    expect(easIgnore).toContain('/android/');
    expect(easIgnore).not.toMatch(/^ios\/$/m);
    expect(easIgnore).not.toMatch(/^android\/$/m);
  });

  it('keeps the add sheet as an in-tree overlay so the system picker can open over it', () => {
    const optionsSource = readFileSync(
      join(process.cwd(), 'src/features/travel/confirmation-import-options.ts'),
      'utf8',
    );
    const detailSource = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-detail.tsx'),
      'utf8',
    );
    const overlaysSource = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-plan-detail-overlays.tsx'),
      'utf8',
    );
    const sheetSource = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-itinerary-add-sheet.tsx'),
      'utf8',
    );
    const stayImportSource = readFileSync(
      join(process.cwd(), 'src/features/travel/stay-confirmation-import.ts'),
      'utf8',
    );

    expect(optionsSource).toContain('preparePicker');
    expect(optionsSource).toContain('pickerDidDismiss');
    expect(stayImportSource).toContain('runConfirmationPicker');
    expect(detailSource).not.toContain('addSheetSuspended');
    expect(overlaysSource).not.toContain('addSheetSuspended');
    expect(overlaysSource).toContain('visible={form.isAddingItem}');
    expect(sheetSource).not.toMatch(/^\s*Modal,/m);
    expect(sheetSource).not.toMatch(/<\s*Modal\b/);
    expect(sheetSource).toContain('absoluteFill');
  });
});

