import {
    asConfirmationFileUri,
    confirmationUrisForDisplay,
    isImageConfirmationUri,
    newestStoredConfirmationUris,
    normalizeConfirmationUris,
    resolveConfirmationUris,
} from '../confirmation-attachments';

describe('confirmation attachments', () => {
  it('keeps durable local and cloud-media URIs', () => {
    expect(
      normalizeConfirmationUris([
        'file:///documents/travel-confirmations/rental/a.jpg',
        ' content://media/123 ',
        '/var/mobile/Containers/Data/Application/ABC/Documents/travel-confirmations/flight/a.jpg',
        'ontrack-media:user-1/travel/abc.pdf',
        'https://example.supabase.co/storage/v1/object/sign/app-media/user-1/travel/abc.pdf?token=stale',
        'https://example.com/x.jpg',
        '',
        12,
      ]),
    ).toEqual([
      'file:///documents/travel-confirmations/rental/a.jpg',
      'content://media/123',
      'file:///var/mobile/Containers/Data/Application/ABC/Documents/travel-confirmations/flight/a.jpg',
      'ontrack-media:user-1/travel/abc.pdf',
    ]);
  });

  it('treats cloud markers as openable without a local file', () => {
    expect(
      confirmationUrisForDisplay(
        ['ontrack-media:user-1/travel/AB2ZQV-confirm.pdf'],
        'flight',
      ),
    ).toEqual(['ontrack-media:user-1/travel/AB2ZQV-confirm.pdf']);
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
