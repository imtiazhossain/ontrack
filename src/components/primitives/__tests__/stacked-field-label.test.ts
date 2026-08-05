import { fieldTitleCase } from '../field-title-case';

describe('fieldTitleCase', () => {
  it('title-cases multi-word field titles and keeps the required marker', () => {
    expect(fieldTitleCase('Departing name *')).toBe('Departing Name *');
    expect(fieldTitleCase('Returning name *')).toBe('Returning Name *');
    expect(fieldTitleCase('Outbound name *')).toBe('Outbound Name *');
  });

  it('leaves already-title-cased labels stable', () => {
    expect(fieldTitleCase('Stay Name *')).toBe('Stay Name *');
    expect(fieldTitleCase('Confirmation Code')).toBe('Confirmation Code');
    expect(fieldTitleCase('Flight Number')).toBe('Flight Number');
  });

  it('normalizes all-caps and mixed labels used in forms', () => {
    expect(fieldTitleCase('FROM')).toBe('From');
    expect(fieldTitleCase('Duration (minutes) *')).toBe('Duration (Minutes) *');
    expect(fieldTitleCase('Pick-up *')).toBe('Pick-Up *');
    expect(fieldTitleCase('What for?')).toBe('What For?');
  });
});
