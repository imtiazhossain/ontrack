import { formatCompactNumber, asNonEmptyString, asPositiveNumber } from '../parse';
import { newId, newPrefixedUuid, newUuid } from '../id';
import { formatDueLabel } from '../date';

describe('parse helpers', () => {
  it('formats compact numbers', () => {
    expect(formatCompactNumber(1)).toBe('1');
    expect(formatCompactNumber(1.5)).toBe('1.5');
    expect(formatCompactNumber(1.25)).toBe('1.25');
  });

  it('reads trimmed and numeric values', () => {
    expect(asNonEmptyString('  hi  ')).toBe('  hi  ');
    expect(asNonEmptyString('   ')).toBeUndefined();
    expect(asPositiveNumber(3)).toBe(3);
    expect(asPositiveNumber(0)).toBeUndefined();
  });
});

describe('id helpers', () => {
  it('creates prefixed local ids and uuids', () => {
    expect(newId('plant')).toMatch(/^plant-/);
    expect(newUuid()).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    );
    expect(newPrefixedUuid('vision')).toMatch(/^vision-/);
  });
});

describe('formatDueLabel', () => {
  it('labels overdue, today, and future due dates', () => {
    expect(formatDueLabel('2000-01-01')).toBe('Overdue');
    expect(formatDueLabel('2000-01-01', { overduePrefix: 'Overdue since' })).toBe(
      'Overdue since January 1',
    );
  });
});
