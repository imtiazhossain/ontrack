import { guessStayBrandDomains } from '../stay-brand-lookup';

describe('guessStayBrandDomains', () => {
  it('turns Centerhotel into centerhotels.com candidates', () => {
    expect(guessStayBrandDomains('Centerhotel Miðgarður')).toEqual([
      'centerhotels.com',
      'centerhotel.com',
    ]);
  });

  it('handles spaced Hotel group names', () => {
    const guesses = guessStayBrandDomains('Center Hotels Plaza');
    expect(guesses).toContain('centerhotels.com');
  });

  it('returns empty for blank titles', () => {
    expect(guessStayBrandDomains('')).toEqual([]);
    expect(guessStayBrandDomains(undefined)).toEqual([]);
  });
});
