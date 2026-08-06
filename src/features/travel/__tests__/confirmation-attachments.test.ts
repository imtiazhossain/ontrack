import {
    asConfirmationFileUri,
    confirmationUrisForDisplay,
    isImageConfirmationUri,
    newestStoredConfirmationUris,
    normalizeConfirmationUris,
    resolveConfirmationUris,
} from '../confirmation-attachments';

describe('confirmation attachments', () => {
  it('keeps only durable local URIs', () => {
    expect(
      normalizeConfirmationUris([
        'file:///documents/travel-confirmations/rental/a.jpg',
        ' content://media/123 ',
        '/var/mobile/Containers/Data/Application/ABC/Documents/travel-confirmations/flight/a.jpg',
        'https://example.com/x.jpg',
        '',
        12,
      ]),
    ).toEqual([
      'file:///documents/travel-confirmations/rental/a.jpg',
      'content://media/123',
      'file:///var/mobile/Containers/Data/Application/ABC/Documents/travel-confirmations/flight/a.jpg',
    ]);
  });

  it('coerces bare absolute paths to file URIs', () => {
    expect(asConfirmationFileUri('/tmp/a.pdf')).toBe('file:///tmp/a.pdf');
    expect(asConfirmationFileUri('file:///tmp/a.pdf')).toBe('file:///tmp/a.pdf');
  });

  it('detects image confirmation URIs', () => {
    expect(
      isImageConfirmationUri(
        'file:///documents/travel-confirmations/flight/page-1.JPG',
      ),
    ).toBe(true);
    expect(
      isImageConfirmationUri(
        'file:///documents/travel-confirmations/flight/ticket.pdf',
      ),
    ).toBe(false);
  });

  it('exports a Documents-relative URI resolver', () => {
    expect(typeof resolveConfirmationUris).toBe('function');
    expect(resolveConfirmationUris(undefined)).toEqual([]);
    expect(resolveConfirmationUris([])).toEqual([]);
  });

  it('keeps Android content:// confirmation URIs openable', () => {
    expect(resolveConfirmationUris(['content://media/external/document/123'])).toEqual([
      'content://media/external/document/123',
    ]);
  });

  it('does not borrow another item\'s confirmation when none is stored', () => {
    expect(confirmationUrisForDisplay(undefined, 'flight')).toEqual([]);
    expect(confirmationUrisForDisplay([], 'stay')).toEqual([]);
  });

  it('exports newest-on-disk confirmation lookup for orphan recovery', () => {
    expect(typeof newestStoredConfirmationUris).toBe('function');
    expect(newestStoredConfirmationUris('flight', 0)).toEqual([]);
  });
});
