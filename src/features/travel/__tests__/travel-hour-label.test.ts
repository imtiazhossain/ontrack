import { formatHourLabel, hourBucketMinutes } from '../travel-hour-label';

describe('travel hour labels', () => {
  it('floors start minutes to the hour', () => {
    expect(hourBucketMinutes(20 * 60 + 25)).toBe(20 * 60);
    expect(hourBucketMinutes(6 * 60 + 15)).toBe(6 * 60);
    expect(hourBucketMinutes(0)).toBe(0);
  });

  it('formats hour labels on the hour with minutes', () => {
    expect(formatHourLabel(20 * 60 + 25)).toBe('8:00 PM');
    expect(formatHourLabel(6 * 60 + 15)).toBe('6:00 AM');
  });
});
