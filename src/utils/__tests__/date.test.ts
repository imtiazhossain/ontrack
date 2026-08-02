import {
  dateDisplayFormatForLocale,
  formatDateKey,
  formatDateKeyShort,
  formatDatePickerTitle,
  formatTimePickerTitle,
  fromDateKey,
  isDateKey,
  nativeDatePickerLocale,
  toDateKey,
} from '@/utils/date';

describe('date keys', () => {
  it('round trips valid local calendar dates', () => {
    expect(toDateKey(fromDateKey('2028-02-29'))).toBe('2028-02-29');
  });

  it('rejects impossible and malformed dates', () => {
    expect(isDateKey('2026-02-29')).toBe(false);
    expect(isDateKey('2026-13-01')).toBe(false);
    expect(isDateKey('07/26/2026')).toBe(false);
  });

  it('uses month-first display only for locales that prefer it', () => {
    expect(dateDisplayFormatForLocale('en-US')).toBe('mdy');
    expect(dateDisplayFormatForLocale('en-PH')).toBe('mdy');
    expect(dateDisplayFormatForLocale('en-CA')).toBe('iso');
    expect(dateDisplayFormatForLocale('en-GB')).toBe('iso');
  });

  it('changes presentation without changing the stored date key', () => {
    const stored = '2026-07-26';
    expect(formatDateKey(stored, 'mdy')).toBe('07/26/2026');
    expect(formatDateKey(stored, 'iso')).toBe(stored);
  });

  it('formats short timeline dates without year or leading zeros', () => {
    expect(formatDateKeyShort('2026-09-08', 'mdy')).toBe('9/8');
    expect(formatDateKeyShort('2026-09-08', 'iso')).toBe('8/9');
    expect(formatDateKeyShort('2026-12-31', 'mdy')).toBe('12/31');
  });

  it('handles legacy preferences without a native picker locale', () => {
    expect(nativeDatePickerLocale(undefined)).toBeUndefined();
    expect(nativeDatePickerLocale('system')).toBeUndefined();
    expect(nativeDatePickerLocale('en-US')).toBe('en_US');
  });

  it('keeps accessibility requirements out of visible picker titles', () => {
    expect(formatDatePickerTitle('Depart date, required')).toBe('Depart Date');
    expect(formatDatePickerTitle('Return date, optional')).toBe('Return Date');
    expect(formatDatePickerTitle('Date of Birth')).toBe('Date of Birth');
  });

  it('keeps accessibility requirements out of visible time picker titles', () => {
    expect(formatTimePickerTitle('Arrival time, required')).toBe('Arrival Time');
    expect(formatTimePickerTitle('Check-out time, optional')).toBe('Check-out Time');
  });
});
