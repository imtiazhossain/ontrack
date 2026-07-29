import type { SharePayload } from 'expo-sharing';

import { normalizeIncomingShare } from '../incoming-share';

const referenceDate = new Date(2026, 6, 28, 12);

function payload(value: string, shareType: SharePayload['shareType'], mimeType?: string) {
  return { value, shareType, mimeType } satisfies SharePayload;
}

describe('incoming share normalization', () => {
  it('normalizes shared text without resolving a network URL', async () => {
    const drafts = await normalizeIncomingShare(
      [payload('Dinner July 30 at 7pm', 'text', 'text/plain')],
      { referenceDate },
    );
    expect(drafts[0]).toMatchObject({
      title: 'Dinner',
      date: '2026-07-30',
      startMinutes: 19 * 60,
      source: 'text',
    });
  });

  it('uses local OCR for shared screenshots', async () => {
    const recognizeText = jest.fn().mockResolvedValue('Dentist July 30 at 3pm');
    const drafts = await normalizeIncomingShare(
      [payload('file:///screenshot.png', 'image', 'image/png')],
      { referenceDate, recognizeText },
    );
    expect(recognizeText).toHaveBeenCalledWith('file:///screenshot.png');
    expect(drafts[0].source).toBe('image');
  });

  it('reads and parses shared calendar files', async () => {
    const readTextFile = jest.fn().mockResolvedValue(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:one
SUMMARY:Appointment
DTSTART:20260730T150000
END:VEVENT
END:VCALENDAR`);
    const drafts = await normalizeIncomingShare(
      [payload('file:///appointment.ics', 'file', 'text/calendar')],
      { readTextFile },
    );
    expect(readTextFile).toHaveBeenCalledWith('file:///appointment.ics');
    expect(drafts[0]).toMatchObject({ source: 'ics', title: 'Appointment' });
  });

  it('creates a blank-date draft for a shared link without a date', async () => {
    const drafts = await normalizeIncomingShare(
      [payload('https://example.com/event', 'url', 'text/uri-list')],
      { referenceDate },
    );
    expect(drafts[0]).toMatchObject({
      source: 'url',
      date: '',
      startMinutes: null,
    });
  });

  it('rejects unsupported payload types', async () => {
    await expect(
      normalizeIncomingShare([payload('file:///sound.mp3', 'audio', 'audio/mpeg')]),
    ).rejects.toThrow('text, links, screenshots, and calendar files');
  });
});
