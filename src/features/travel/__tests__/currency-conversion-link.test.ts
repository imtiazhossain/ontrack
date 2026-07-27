import {
  googleCurrencyConversionUrl,
  homeCountryForLocale,
} from '../currency-conversion-link';

describe('Google currency conversion link', () => {
  it('uses the user locale region as the home country', () => {
    expect(homeCountryForLocale('en-US')).toBe('United States');
    expect(homeCountryForLocale('en_GB')).toBe('United Kingdom');
  });

  it('searches for conversion from home-country currency to the destination currency', () => {
    const url = new URL(
      googleCurrencyConversionUrl('Lisbon, Portugal', 'en-US'),
    );

    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('q')).toBe(
      'United States currency to Lisbon, Portugal currency converter',
    );
  });

  it('falls back gracefully when the device locale has no usable region', () => {
    const url = new URL(googleCurrencyConversionUrl('Japan', 'system'));

    expect(url.searchParams.get('q')).toBe(
      'my home country currency to Japan currency converter',
    );
  });
});
