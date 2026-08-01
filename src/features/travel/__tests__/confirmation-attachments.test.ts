import {
  isImageConfirmationUri,
  normalizeConfirmationUris,
  resolveConfirmationUris,
} from '../confirmation-attachments';

describe('confirmation attachments', () => {
  it('keeps only durable local URIs', () => {
    expect(
      normalizeConfirmationUris([
        'file:///documents/travel-confirmations/rental/a.jpg',
        ' content://media/123 ',
        'https://example.com/x.jpg',
        '',
        12,
      ]),
    ).toEqual([
      'file:///documents/travel-confirmations/rental/a.jpg',
      'content://media/123',
    ]);
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
});
