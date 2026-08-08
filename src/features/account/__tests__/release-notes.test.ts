import {
  catalogTopVersionDiffers,
  CHANGELOG,
  formatAppVersionLabel,
  formatCurrentAppVersionLabel,
  formatVersionNotesDate,
  formatVersionNotesHeading,
  getChangelog,
  getReleaseNotes,
  groupVersionNotesByDate,
  RELEASE_NOTES,
} from '../release-notes';

describe('release-notes catalogs', () => {
  it('keeps Release Notes and Changelog newest-first with aligned top versions', () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(1);
    expect(CHANGELOG.length).toBeGreaterThan(1);
    expect(RELEASE_NOTES[0]?.version).toBe(CHANGELOG[0]?.version);
    expect(RELEASE_NOTES.map((entry) => entry.version)).toEqual(
      CHANGELOG.map((entry) => entry.version),
    );
    expect(getReleaseNotes()).toBe(RELEASE_NOTES);
    expect(getChangelog()).toBe(CHANGELOG);
  });

  it('formats the Profile version label with and without build', () => {
    expect(formatAppVersionLabel('1.0.2', undefined)).toBe('Version 1.0.2');
    expect(formatAppVersionLabel('1.0.2', '42')).toBe('Version 1.0.2 (42)');
    expect(formatAppVersionLabel('—')).toBe('Version —');
  });

  it('formats the App Updates current-version label', () => {
    expect(formatCurrentAppVersionLabel('1.0.2', undefined)).toBe(
      'Current Version: 1.0.2',
    );
    expect(formatCurrentAppVersionLabel('1.0.2', '42')).toBe(
      'Current Version: 1.0.2 (42)',
    );
  });

  it('detects catalog vs runtime version mismatch', () => {
    expect(catalogTopVersionDiffers(RELEASE_NOTES, RELEASE_NOTES[0]!.version)).toBe(
      false,
    );
    expect(catalogTopVersionDiffers(RELEASE_NOTES, '9.9.9')).toBe(true);
    expect(catalogTopVersionDiffers([], '1.0.2')).toBe(false);
  });

  it('formats catalog dates as MM/DD/YYYY', () => {
    expect(formatVersionNotesDate('2026-08-07')).toBe('08/07/2026');
    expect(formatVersionNotesHeading({ version: '1.0.2', date: '2026-08-07' })).toBe(
      '1.0.2 · 08/07/2026',
    );
  });

  it('groups notes by day with latest day and version on top', () => {
    const grouped = groupVersionNotesByDate([
      {
        version: '1.0.3',
        date: '2026-08-07',
        notes: ['c'],
      },
      {
        version: '1.0.2',
        date: '2026-08-07',
        notes: ['b'],
      },
      {
        version: '1.0.1',
        date: '2026-07-15',
        notes: ['a'],
      },
    ]);
    expect(grouped.map((day) => day.date)).toEqual(['2026-08-07', '2026-07-15']);
    expect(grouped[0]?.entries.map((entry) => entry.version)).toEqual([
      '1.0.3',
      '1.0.2',
    ]);
  });
});
