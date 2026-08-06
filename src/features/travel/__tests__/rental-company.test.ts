import { rentalCompanyDomain } from '../rental-company';

describe('rentalCompanyDomain', () => {
  it('resolves known brands', () => {
    expect(rentalCompanyDomain('Hertz')).toBe('hertz.com');
    expect(rentalCompanyDomain('Enterprise Rent-A-Car')).toBe('enterprise.com');
    expect(rentalCompanyDomain('Sixt')).toBe('sixt.com');
  });

  it('is case-insensitive and ignores surrounding words', () => {
    expect(rentalCompanyDomain('hertz gold plus')).toBe('hertz.com');
    expect(rentalCompanyDomain('AVIS')).toBe('avis.com');
  });

  it('returns undefined for unknown or empty companies', () => {
    expect(rentalCompanyDomain(undefined)).toBeUndefined();
    expect(rentalCompanyDomain('  ')).toBeUndefined();
    expect(rentalCompanyDomain('Local Mom & Pop Cars')).toBeUndefined();
  });
});
